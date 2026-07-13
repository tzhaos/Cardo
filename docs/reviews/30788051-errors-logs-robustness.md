# Errors, logging, robustness (30788051)

Review date: 2026-07-13  
Method: read-only pass over Runtime HTTP/auth/lock/discovery/queue/events/clients/log, RuntimeClient, DomainCommandError handlers, Desktop update + ensureDesktopRuntime, CLI, Extension NM discover, native-host codec/main, process handlers. Compared against prior review `docs/reviews/f432f78a-errors-logs-robustness.md` and worklogs under `docs/reviews/worklogs/f432f78a-*.md`.

Scope paths (primary):

- `src/runtime/httpServer.ts`, `auth.ts`, `lock.ts`, `discovery.ts`, `commandQueue.ts`, `clients.ts`, `events.ts`, `log.ts`, `index.ts`, `database.ts`, `openLocalResourceHook.ts`
- `src/client/runtimeClient.ts`
- `src/core/application/domainError.ts` (+ command handlers)
- `src/desktop/ensureDesktopRuntime.ts`, `src/desktop/update/*`, `src/desktop/main.ts`, `src/desktop/runtimeChild.ts`
- `src/cli/main.ts`
- `src/extension/runtime/discoverRuntime.ts`
- `src/native-host/*`

## Executive judgment

Cardo Runtime is a solid local multi-client hub with a clear fail-closed bias on the control plane: exclusive lock with `starting`/`ready`, discovery as the sole secrets file, Bearer auth with constant-time compare, CORS allowlist, Zod at wire boundaries, serial SQLite via CommandQueue, and a careful client revision/apply model.

Prior high-severity hardening from f432f78a has largely landed and holds under re-review:

| Prior claim | Status | Evidence |
| --- | --- | --- |
| DomainCommandError → 4xx | Landed | `domainError.ts`; `httpServer.ts` ~178–180; handlers in page/item/box/workspace |
| ready_timeout fail-closed | Landed | `runtimeClient.ts` `waitForFirstReady` rejects; stream fail before ready rejects waiters (~497–586) |
| SHA256 required for updates | Landed | `githubReleaseClient.ts` throws `missing_checksum`; `desktopUpdate.ts` requires 64-hex `sha256`; download refuses empty hash |
| Install re-verify SHA256 | Landed | `desktopUpdater.ts` `hashFileSha256` before spawn/portable apply (~301–316) |
| Session keep on stream close | Landed | `clients.ts` `onStreamClose` only clears streaming + touch (~102–111) |
| Process crash handlers | Landed | `runtime/index.ts` `registerRuntimeProcessHandlers`; CLI serve + runtime-child early register; Desktop Main `main.log` |
| runtimeLog structured | Landed (lifecycle only) | `log.ts` + start/stop/fatal in `index.ts`; no per-request HTTP log |
| busy_timeout | Landed | `database.ts` `PRAGMA busy_timeout = 5000` |
| Schema attach exact match | Landed | `runtimeCompatibility.ts` equality on `DATABASE_SCHEMA_VERSION` |

Residual risk is no longer “auth open” or “updates fail-open.” It is operational diagnosis (sparse request logs), local DoS / capability edges (NM unbounded frames, open-any-path, openExternal schemes), multi-client last-writer-wins (`baseRevision` still advisory), and UX that still swallows structured error codes into `console.error`.

Overall: medium risk for production ops and multi-surface concurrent edit; low–medium for supply-chain install integrity and first-connect half-open sessions (those paths are now fail-closed). Same-OS-user threat model remains intentional.

## Strengths

1. Lock protocol (`src/runtime/lock.ts`): exclusive `wx` create, `status=starting` without fake baseUrl, health-over-pid on Windows, startup grace 30s, single stale-cleanup retry, ready young-window re-probe (~2s).
2. Secrets separation: lock never carries token; discovery is sole secrets file with best-effort `0o600` (`discovery.ts`).
3. Auth (`auth.ts`): 32-byte process token, 24-byte one-time codes, 60s TTL, single-use exchange, `timingSafeEqual` length-safe compare.
4. HTTP surface (`httpServer.ts`): bind via listen on `127.0.0.1` (`index.ts`); public routes limited to `/v1/health` + `/v1/auth/exchange`; all other `/v1/*` require Bearer; 2 MiB JSON body cap; static path null-byte + resolve-under-root checks.
5. CORS allowlist: extension schemes + same-port loopback only; metrics `corsRejectedCount` / `authFailCount`.
6. Domain error taxonomy: `DomainCommandError` maps not_found→404, conflict→409, precondition/invalid→400; outer catch in `handleRequest` maps before generic 500.
7. SQLite serialization: mutations and DB reads share `CommandQueue`; `busy_timeout=5000`.
8. Client revision model (`runtimeClient.ts`): localRevision / lastAppliedRevision, self-echo, gap → full catch-up, apply mutex, first-ready fail-closed, reconnect rebind on invalid client id.
9. Session vs stream: stream close does not unregister; idle sweep or session.bye ends session; reconnect can re-hello.
10. Desktop attach-first / embed-if-missing; no in-process Runtime in Main; schema + `/app` UI required for attach; incompatible Runtime retire via authenticated shutdown.
11. Update pipeline fail-closed: missing SUMS / missing entry / empty hash refuse; download verifies SHA-256; install re-hashes; portable never falls back to Setup.
12. Process handlers: Runtime fatal path logs, races `stopRuntime` 2s, force-clears lock/discovery if still owned, `exit(1)`.
13. CLI open: one-time code in URL only; never long-lived token in query.
14. Extension discover: NM-only, typed errors (`native_host_missing`, `runtime_unavailable`, schema mismatch).
15. structured logger redacts secret keys (token / oneTimeCode / authorization / password / secret) including nested objects (`log.ts`).

## Findings

### F1 — Severity: high
- Area: Native Messaging frame size (local DoS)
- Evidence: `src/native-host/messageCodec.ts:11–28` (`readUInt32LE` with no max); `src/native-host/main.ts:16–53` (concatenates stdin until frame completes)
- Risk: Malicious or buggy extension can advertise a huge body length and force multi-GB allocation / OOM of the NM host. HTTP already caps JSON at 2 MiB (`httpServer.ts:727`); NM does not.
- Recommendation: Cap body (e.g. 1–2 MiB aligned with `MAX_JSON_BODY_BYTES`); reject oversize with error response, reset buffer, log diagnostic once.

### F2 — Severity: medium
- Area: native-host open path uses raw input on non-Windows
- Evidence: `src/native-host/openLocalResource.ts:53–57` spawns `open`/`xdg-open` with `[resourcePath]` after validating `normalized.path`; Windows correctly uses `normalized.path` (~41–42). Runtime hook is correct: `openLocalResourceHook.ts:26–28` uses `normalized.path`.
- Risk: Quote/normalization bypass or path confusion on macOS/Linux if raw string differs from normalized form; inconsistent with Runtime capability path.
- Recommendation: Always pass `normalized.path` to spawn; keep existence checks consistent across platforms if product wants fail-closed open.

### F3 — Severity: medium
- Area: Desktop `shell:open-external` scheme allowlist missing
- Evidence: `src/desktop/main.ts:418–420` → `shell.openExternal(desktopUrlRequestSchema.parse(input).url)`; schema is `z.url()` only (`desktopIpc.ts:16`)
- Risk: Renderer (or compromised UI) can open non-http schemes (`file:`, custom protocols) if Electron does not block them. Separate from intentional local-resource open.
- Recommendation: Allowlist `http:` / `https:` (optional `mailto:`); reject others with structured IPC error.

### F4 — Severity: medium
- Area: Runtime request / outcome logging still thin
- Evidence: `runtimeLog` used only for lifecycle + fatal in `src/runtime/index.ts`; `httpServer.ts` increments metrics but never `runtimeLog`s method/path/status/duration/commandType
- Risk: Production support cannot reconstruct failed command sequences, auth fail bursts, or slow mutations without client screenshots. Diagnostics counters help only while Runtime is up and authenticated.
- Recommendation: Minimal structured lines to `logPath`: auth fail (sampled), command type + durationMs + outcome code + clientId, shutdown, lock acquire fail. Keep secret redaction; sample high-volume queries.

### F5 — Severity: medium
- Area: baseRevision advisory / multi-client last-writer-wins
- Evidence: Protocol optional `baseRevision` (`runtimeProtocol.ts:85–111`); client always sends it (`runtimeClient.ts:154–161`, history undo/redo); server never compares (`httpServer.ts` command path ~257–298 ignores field after Zod parse)
- Risk: Concurrent Desktop + Extension + Web editors silently overwrite; undo stacks surprise users. Documented v1 design, still a robustness gap for multi-surface use.
- Recommendation: Keep advisory for v1 product; add diagnostics metric when `baseRevision != getRevision()` after enqueue; plan `revision_conflict` (409) OCC when product prioritizes multi-editor safety. `DomainErrorCode` already includes `conflict` but nothing emits it yet.

### F6 — Severity: medium
- Area: UI error surface ignores stable codes
- Evidence: Server returns `runtimeErrorSchema` codes; client throws `RuntimeClientError` with `code` + `status` (`runtimeClient.ts:51–60`, `728–742`); UI `reportCommandError` only `console.error` (`workspaceStore.ts:440–442`); preferences similarly logs only
- Risk: Domain 4xx mapping is invisible to users (“final normal page cannot be deleted” looks like opaque failure). Hardening on the wire is incomplete without toast / i18n mapping.
- Recommendation: Map `RuntimeClientError.code` to i18n messages; distinguish 4xx precondition vs 5xx internal; optional retry for stream/ready_timeout.

### F7 — Severity: medium
- Area: Web bootstrap stores process token in sessionStorage
- Evidence: `hostPlatform.ts:113–123` exchange → `sessionStorage.setItem('cardo.runtime.token', exchanged.token)`; exchange returns process token (`auth.ts:65–71`)
- Risk: Same-origin XSS or compromised static asset reads full process token → workspace R/W, openLocalResource, shutdown. URL strip of code is good; long-lived process token in sessionStorage widens blast radius.
- Recommendation: Prefer memory-only token after exchange where reload can re-bootstrap; longer term: distinct short-lived client sessions with reduced capabilities; keep process token for stewards (CLI/Desktop/NM).

### F8 — Severity: medium
- Area: ensureDesktopRuntime retire timeout is soft
- Evidence: `ensureDesktopRuntime.ts:132–196` — incompatible Runtime shutdown wait up to 8s; on timeout only `console.warn`, then spawn proceeds (~53–64)
- Risk: Old Runtime still holding lock → embed child fails with lock conflict or race attach; user sees generic timeout rather than “stop failed, run cardo stop”.
- Recommendation: If retire times out and health still ok, fail closed with actionable message (do not spawn); only spawn when lock free or health false.

### F9 — Severity: medium
- Area: No per-command / queue timeout
- Evidence: `commandQueue.ts` unlimited chain; `httpServer` awaits enqueue with no deadline; stuck DB or hook holds all mutations/queries
- Risk: Single hung openLocalResource or rare SQLite stall serializes the entire Runtime until process kill; clients hang without structured `queue_timeout`.
- Recommendation: Per-task timeout on enqueue (or at least on capability hooks); expose queueDepth (already in diagnostics) + oldest-wait metric; fail request with 503/504 style code without poisoning the queue forever (careful with SQLite txn cancelability).

### F10 — Severity: medium
- Area: Powerful local capabilities under one token
- Evidence: Authenticated client can `POST /v1/shutdown` (`httpServer.ts:467–471`), open arbitrary paths via capability (`417–429`), export full workspace; bootstrap exchange yields same process token
- Risk: Intentional same-user model, but any surface that holds the token (Web sessionStorage, Extension after NM discover) is a full steward. Shutdown from a compromised tab ends Runtime for all clients.
- Recommendation: Document explicitly in product terms; optional later: scope tokens (read-only / no-shutdown) for Web after exchange; keep shutdown for CLI/Desktop stewards.

### F11 — Severity: low
- Area: Residual plain `Error` → 500 for “not initialized”
- Evidence: `throw new Error('Cardo app state is not initialized.')` / preferences not initialized in handlers (e.g. `pageCommandHandlers.ts:306`, `preferencesCommandHandlers.ts:35`); worklog intentionally left these as 500
- Risk: Empty/corrupt DB surfaces as internal_error with raw message; acceptable as programming/corruption path, but noisy for first-boot races if seed order wrong.
- Recommendation: Keep 500 for true corruption; if product sees user-facing init races, map to `precondition_failed` with stable code.

### F12 — Severity: low
- Area: 500 still echoes `error.message`
- Evidence: `httpServer.ts:182–186` `internal_error` with `error instanceof Error ? error.message : 'Internal error.'`
- Risk: Rare stack/SQL text may leak to any token holder. Local-only mitigates exposure.
- Recommendation: Sanitize 500 messages in production builds (“Internal error.” + log full detail via `runtimeLog`); keep detail in diagnostics for stewards if needed.

### F13 — Severity: low
- Area: EventHub double cleanup
- Evidence: `events.ts:51–52` both `close` and `error` call same cleanup → `onClose` may run twice
- Risk: `onStreamClose` is idempotent today; if cleanup gains side effects later (metrics, grace), double-fire could mis-count.
- Recommendation: Guard cleanup with `once` flag per subscriber.

### F14 — Severity: low
- Area: Corrupt lock/discovery silent null
- Evidence: `lock.ts:49–57`, `discovery.ts:26–34` parse failure → null without log
- Risk: Looks like “Runtime not running” when file is garbage; harder to diagnose than a single structured warn.
- Recommendation: `runtimeLog('warn', 'lock_corrupt' | 'discovery_corrupt', { path })` once per read path (rate-limited).

### F15 — Severity: low
- Area: error-screen hardcodes schema version 9
- Evidence: `error-screen.ts:80–87` “schemaVersion 为 9” / “schemaVersion is 9”
- Risk: Violates product rule to interpolate `DATABASE_SCHEMA_VERSION`; next schema bump makes copy wrong and confuses support.
- Recommendation: Inject `DATABASE_SCHEMA_VERSION` (or hello schema) into steps text.

### F16 — Severity: low
- Area: native-host process crash surface
- Evidence: `native-host/main.ts` has no `unhandledRejection` / uncaught handlers; only stdin end → exit
- Risk: Unexpected throw outside handleChain can leave host zombie or silent; browser may respawn NM, but diagnostics may miss the reason.
- Recommendation: Register minimal handlers → `writeNativeHostDiagnostic` + exit(1).

### F17 — Severity: low
- Area: History HTTP routes ignore request body
- Evidence: `httpServer.ts:301–325` undo/redo never `readJsonBody` / parse `historyUndoRequestSchema`; client still sends `baseRevision`
- Risk: Low (advisory anyway); inconsistent wire hygiene if body later required.
- Recommendation: Parse body with Zod for consistency; still ignore baseRevision until OCC lands.

### F18 — Severity: low
- Area: Desktop Main fatal path logs only
- Evidence: `main.ts:191–216` uncaughtExceptionMonitor + unhandledRejection write `main.log` but do not exit; Electron may still terminate depending on version
- Risk: Residual from process-log worklog; acceptable if Electron default is terminate, but inconsistent with Runtime exit(1).
- Recommendation: Document behavior; optionally quit app after crash log for packaged builds.

## Prior hardening verification (detail)

### DomainCommandError
- Type + HTTP status defaults: `src/core/application/domainError.ts:1–11`
- Catch mapping: `httpServer.ts:178–180` inside top-level `handleRequest` try/catch (covers awaited `queue.enqueue` throws)
- Handlers convert user-facing preconditions/not-found; conflict code reserved unused
- Outer command Zod failures stay 400 `invalid_payload` before handler (~263–276)

### ready_timeout fail-closed
- Timeout rejects: `runtimeClient.ts:497–507` code `ready_timeout`
- Stream error before first ready rejects waiters: ~577–586
- Success path only `resolveFirstReadyWaiters` from ready event finally: ~459–461
- `close()` rejects waiters with `client_closed`: ~349–351

### SHA256 required + re-verify
- Fetch: no SUMS asset → throw (~192–198); no entry → throw (~215–219)
- Download: empty expected → throw (~250–256); mismatch deletes partial (~304–309)
- Contract: `sha256` required 64-hex (`desktopUpdate.ts:37–38`) — worklog note about nullable schema is outdated
- Install: re-hash file (~311–316); portable channel migration refused (~294–299)

### Session keep on stream close
- `clients.onStreamClose`: streaming=false + lastSeenAt only (~106–111)
- Reconnect rebind when server returns 400 invalid client id (~589–596, 541–545)
- Idle sweep still unregisters non-streaming after 60s (~141–153)

### Process handlers + runtimeLog
- `registerRuntimeProcessHandlers`: unhandledRejection + uncaughtException → log → stopRuntime race 2s → force lock/discovery cleanup → exit(1) (`index.ts:79–140`)
- CLI serve + daemon-child: early set path + register (`cli/main.ts:84–86`)
- runtime-child: same (`runtimeChild.ts:26–27`)
- Desktop Main: crash log to userData/logs/main.log (`main.ts:191–216`)
- Lifecycle events: runtime_starting/started/stopping/stopped; secret keys redacted in `log.ts`

## Boundary trust map

| Boundary | Untrusted input | Validation / enforcement | Fail mode |
| --- | --- | --- | --- |
| Runtime HTTP (loopback) | Method, path, headers, JSON, Origin | CORS allowlist; Bearer for `/v1/*` except health + exchange; Zod; 2 MiB body; clientId UUID + registry for mutations/events | 403 cors, 401 auth, 400 invalid_payload, DomainCommandError 4xx, 500 internal |
| auth.exchange | oneTimeCode | Zod + single-use map + TTL | 401 |
| auth.bootstrap | Bearer process token | Same as other /v1 | 401 |
| discovery.json | Disk content | Zod strict; token min 32 | null → unavailable |
| runtime.lock | Disk content | Zod; health/pid/status rules | held / stale clean |
| SSE | Stream bytes | `runtimeEventSchema.safeParse`; drop invalid | reconnect |
| RuntimeClient HTTP | Server JSON | Response Zod; RuntimeClientError | throw to UI |
| Desktop IPC | Renderer payloads | Zod Main + preload | throw / parse fail |
| Desktop preload | Main sync config | desktopRuntimeConfigSchema; missing → `__CARDO_RUNTIME_MISSING__` | fail closed |
| Native Messaging stdin | Length-prefixed JSON | Zod request; no max frame (gap F1) | error response |
| Extension NM | Host response | Zod + schema compat | typed discover errors |
| openLocalResource | Path string | normalize empty/null; win exists check; OS open | false / error |
| openExternal (Desktop) | URL | `z.url()` only (gap F3) | Electron scheme behavior |
| GitHub updates | Release JSON + binary | Zod; required SHA256; re-hash at install | error state / refuse |
| Static `/app` | URL path | resolve under root; null-byte | 403 / 404 |

Trust assumption: same OS user who can read discovery.json or receive NM discover response is a full Runtime peer. Appropriate for personal local hub; not multi-user isolation.

## Logging inventory

| Surface | Destination | What is logged | Gaps |
| --- | --- | --- | --- |
| Runtime library | stderr + optional `%DATA%/runtime.log` via `runtimeLog` | lifecycle start/stop; fatal unhandled; force cleanup | No per-request access log; no command outcome lines |
| Runtime HTTP | In-memory metrics on `/v1/diagnostics` | corsRejectedCount, authFailCount, lastMutationAt, queueDepth | Requires live auth’d diagnostics |
| CLI | stdout/stderr; daemon-child appends sparse lines to runtime.log | serve/status/stop/open human text | No levels; token never printed (good) |
| Desktop Main | console; debug package → debug.log; crashes → main.log | attach/embed, tray, update, crash stacks | Production sparse unless crash |
| runtime-child | runtime.log + stderr | start/ready/fail + structured runtimeLog | No HTTP detail |
| native-host | `%LOCALAPPDATA%/cardo/native-host.log` (win) or `~/.cardo/native-host.log` | request types, discover, open-failed, paths | Paths are path disclosure to log readers; no frame-size rejects |
| Extension / Web | console.error | command fail, bootstrap fail | No code→toast mapping (F6) |
| `src/core/log.ts` | console (Vite DEV gated) | UI-oriented helper | Runtime Node path uses `runtime/log.ts` instead |

Secrets hygiene: `runtimeLog` redacts token/oneTimeCode/authorization/password/secret. CLI open messaging avoids printing process token. Diagnostics JSON must not grow token fields. NM discover returns token to the extension by design (in-process to browser, not log). Avoid logging Authorization headers or discovery dumps.

## Top 10 hardening actions

1. Cap Native Messaging frame size (1–2 MiB) and reset buffer on oversize (`messageCodec.ts`, `main.ts`) — closes local OOM DoS.
2. Always open `normalized.path` on all platforms in native-host (`openLocalResource.ts`); keep Runtime hook as reference.
3. Allowlist Desktop `shell:open-external` to http(s) (and explicit extras) (`main.ts`, IPC schema).
4. Add structured Runtime command/auth outcome logs to `logPath` without secrets (`httpServer` + `runtimeLog`) — ops visibility.
5. Surface `RuntimeClientError.code` in UI toasts/i18n (`workspaceStore` / preferences fireCommand paths) so Domain 4xx pays off.
6. On incompatible Runtime retire timeout, fail closed instead of spawn-anyway (`ensureDesktopRuntime.ts`).
7. Prefer memory-only Web session token (or scoped post-exchange sessions); avoid long-lived process token in sessionStorage where possible (`hostPlatform.ts`, auth model).
8. Add queue/command timeout policy so one stuck task cannot hold CommandQueue indefinitely (`commandQueue.ts` / capability hooks).
9. Emit diagnostics when client `baseRevision` ≠ server revision after command; plan OCC `revision_conflict` when multi-editor is product priority.
10. Interpolate `DATABASE_SCHEMA_VERSION` in error-screen steps; optional native-host process crash handlers + corrupt lock/discovery warn logs for supportability.

## Appendix — residual vs prior f432f78a

| Prior finding | 30788051 status |
| --- | --- |
| F1 domain → 500 | Mitigated (DomainCommandError); UI still weak (new F6) |
| F2 ready soft-success | Fixed (fail-closed) |
| F3 update SHA256 fail-open | Fixed + install re-verify |
| F4 process handlers | Fixed (Runtime/CLI/child/Main) |
| F5 install TOCTOU | Mostly fixed (re-hash at install) |
| F6 structured logging | Partial (lifecycle only; still F4 here) |
| F7 sessionStorage token | Open (F7) |
| F8 open path / openExternal | Partially open (F2, F3) |
| F9 retire race soft | Open (F8) |
| F10 NM frame size | Open (F1 high) |
| F11 baseRevision advisory | Open (F5) |
| F12 busy_timeout / queue timeout | busy_timeout fixed; queue timeout still open (F9) |
| Schema attach only `<` | Fixed (exact equality) |

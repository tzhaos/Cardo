# Errors, logging, robustness review (f432f78a)

Review date: 2026-07-13  
Scope: Runtime HTTP/auth/lock/discovery, RuntimeClient, command/history queue, Desktop update + ensureRuntime, CLI, Extension NM discover, native-host.  
Method: full reads of critical paths plus greps for swallow, console, unhandledRejection, process.on, token handling, timeouts/backoff.

## Executive judgment

Cardo’s local multi-client Runtime is substantially more careful than a typical loopback app: exclusive lock with `starting`/`ready`, discovery as the only secrets file, Bearer auth with constant-time compare, one-time bootstrap codes, CORS allowlist, Zod at wire boundaries, a serial CommandQueue, and a thoughtful client-side revision/apply mutex with SSE reconnect backoff.

The largest remaining gaps are not “auth completely open,” but (1) error taxonomy and fail-closed edges that still soft-succeed or map domain failures to opaque 500s, (2) production diagnosis (almost no structured Runtime logs), (3) update pipeline fail-open when SHA256 is missing and no re-verify at install, (4) process-level crash surfaces outside Desktop debug packages, and (5) powerful local capabilities (open any path, shutdown, full process token after exchange) that are intentional for a same-user threat model but need explicit policy and UX error codes.

v1 design docs intentionally mark `baseRevision` as advisory and defer strict OCC; that is not a surprise bug, but multi-client last-writer-wins remains a robustness risk for concurrent editors.

Overall: solid local-protocol foundation, fail-closed on several Desktop/Extension entry paths, still medium risk for production ops and supply-chain update edges.

## Strengths

1. Exclusive Runtime lock protocol (`src/runtime/lock.ts`): `wx` create, `status=starting` without fake baseUrl, health-prefer-over-pid on Windows, startup grace, single stale-cleanup retry.
2. Secrets separation: lock never holds token; discovery is the sole secrets file with best-effort `0o600` (`src/runtime/discovery.ts`).
3. Auth primitives: 32-byte process token, 24-byte one-time codes, TTL 60s, single-use exchange, `timingSafeEqual` (`src/runtime/auth.ts`).
4. HTTP surface binds `127.0.0.1`; `/v1/*` requires Bearer except health + auth.exchange; static UI path checks null-byte and `path.resolve` under root (`src/runtime/httpServer.ts`).
5. CORS allowlist: extension schemes + same-port loopback only; metrics for cors/auth failures.
6. Mutation serialization via `CommandQueue` on server and request queue + apply mutex on client (`src/runtime/commandQueue.ts`, `src/client/runtimeClient.ts`).
7. Client revision model (localRevision / lastAppliedRevision, self-echo, gap → full catch-up) matches design §6.10–§6.11 and avoids clamping watermarks.
8. SSE uses fetch + Authorization (not EventSource URL token); reconnect with exponential backoff 250ms→8s.
9. Desktop attach-first / embed-if-missing, no in-process Runtime in Electron Main; preload fail-closed sentinel when config missing (`src/desktop/ensureDesktopRuntime.ts`, `src/desktop/preload.ts`).
10. Desktop IPC request/response Zod schemas; contextIsolation + no nodeIntegration.
11. Update download uses `.partial` then rename; verifies SHA256 when expected hash present (`src/desktop/update/githubReleaseClient.ts`).
12. CLI `open` never puts long-lived token in URL; uses bootstrap one-time code.
13. Extension discovery is NM-only and fails with typed codes (`native_host_missing`, `runtime_unavailable`).
14. Command/history/ensureInitialized share one transaction model with revision bump on real mutations (`executeDatabaseCommand`, `historyEngine`).

## Findings

### F1 — Severity: high
- Area: HTTP error mapping / client UX
- Evidence: `src/runtime/httpServer.ts:172-181`, `src/runtime/httpServer.ts:252-293`, `src/core/application/executeDatabaseCommand.ts:28-76`, domain throws e.g. `src/core/application/itemCommandHandlers.ts`, `src/core/application/pageCommandHandlers.ts`
- Risk: Any handler/`parseWorkspaceCommand`/`Zod` throw after the outer request Zod parse becomes HTTP 500 `internal_error` with raw `error.message`. Business failures (“Page does not exist”, “final normal page cannot be deleted”) look like server crashes; UI only gets generic failure (`workspaceStore` logs `console.error`). No stable `code` taxonomy for conflict, not-found, precondition, validation-after-parse.
- Recommendation: Map known domain errors to 4xx with stable codes (e.g. `precondition_failed`, `not_found`, `invalid_command`); keep 500 for unexpected exceptions with sanitized messages; surface codes in renderer toasts.

### F2 — Severity: high
- Area: RuntimeClient connect / first ready
- Evidence: `src/client/runtimeClient.ts:128-139`, `src/client/runtimeClient.ts:492-505`, `src/client/runtimeClient.ts:531-537`
- Risk: `waitForFirstReady(10_000)` resolves on timeout without throwing. Stream failure before ready also calls `resolveFirstReadyWaiters()`. `connect()` can return success while never receiving `ready`, leaving UI “connected” (`hostPlatform` sets connected after connect) with incomplete event subscription. Half-open sessions are hard to diagnose.
- Recommendation: Fail closed: throw `ready_timeout` after timeout; only resolve waiters on actual ready (or explicit reconnect path); distinguish first-connect failure from background reconnect.

### F3 — Severity: high
- Area: Desktop update integrity (fail-open)
- Evidence: `src/desktop/update/githubReleaseClient.ts:194-224`, `src/desktop/update/githubReleaseClient.ts:286-305`, `src/desktop/update/desktopUpdater.ts:273-306`
- Risk: If `SHA256SUMS` is missing, fetch fails, or file name does not match, `sha256` stays `null` and download proceeds. Size check is only used when hash is absent; install runs whatever is on disk without re-hash. Compromised or substituted assets (or partial corrupt publish) can still install if size matches or size is also absent.
- Recommendation: Fail closed when expected checksum is missing for stable channel; require SHA256SUMS for installable releases; re-verify hash immediately before `spawn`/portable replace; refuse install if hash unknown.

### F4 — Severity: high
- Area: Unhandled rejections / process crash surfaces
- Evidence: `src/desktop/main.ts:185-196` (debug package only), `src/desktop/runtimeChild.ts:81-84`, `src/cli/main.ts:136-137`, `src/runtime/index.ts` (no process handlers), `src/native-host/main.ts`
- Risk: Production Desktop does not register `unhandledRejection` / uncaught monitors (only debug package). Runtime child and CLI register SIGINT/SIGTERM but not unhandledRejection. A rejected promise outside the main async chain can leave lock/discovery stuck until stale recovery, or silent Main instability.
- Recommendation: Register process-level error monitors in Runtime child, CLI serve, and packaged Desktop Main; always attempt lock/discovery cleanup on fatal path; log to `runtime.log` / debug log.

### F5 — Severity: medium
- Area: Update download cleanup / TOCTOU
- Evidence: `src/desktop/update/githubReleaseClient.ts:241-248`, `src/desktop/update/desktopUpdater.ts:273-306`
- Risk: Abort cleans download state somewhat, but install does not re-read checksum of `installerPath`. Between `readyToInstall` and install, file could be replaced on multi-user machines (less common on single-user desktop). Failed downloads remove `.partial` on hash mismatch but incomplete error paths after rename leave artifacts under `userData/updates`.
- Recommendation: Hash file again at install time; prune old installers; bound updates directory size.

### F6 — Severity: medium
- Area: Logging (Runtime production diagnosis)
- Evidence: `src/runtime/httpServer.ts` (metrics only, no request log), `src/core/log.ts` (warn/debug gated to Vite DEV; errors always), CLI/Desktop use ad-hoc `console.*` and `runtime.log` for child spawn only
- Risk: Auth fail/cors counters exist on `/v1/diagnostics` but there is no structured per-request log (method, path, status, duration, clientId). Production Runtime failures rely on client stderr and sparse `runtime.log` lines from spawn wrappers. No levels, no correlation id, no redaction policy document.
- Recommendation: Add minimal structured JSON lines to `logPath` (info/warn/error): start/stop, auth fail sample, command type + duration + outcome code, shutdown, lock steal. Never log Bearer tokens or oneTimeCode. Sample high-volume query paths.

### F7 — Severity: medium
- Area: Token storage after Web bootstrap
- Evidence: `src/web-next/platform/hostPlatform.ts:113-123`, architecture notes that v1 may store session token in sessionStorage; exchange returns process token (`src/runtime/auth.ts:61-71`)
- Risk: Same-origin XSS (or compromised static asset) reads `sessionStorage` process token → full workspace R/W, openLocalResource, shutdown. Code is stripped from URL (good), but long-lived process token in sessionStorage widens blast radius vs short-lived session tokens.
- Recommendation: Prefer memory-only after exchange where possible; longer term: distinct short-lived client sessions with reduced capabilities; keep process token for stewards only.

### F8 — Severity: medium
- Area: Local capability / path open safety
- Evidence: `src/runtime/httpServer.ts:412-424`, `src/runtime/openLocalResourceHook.ts`, `src/native-host/openLocalResource.ts:53-57`, `src/core/services/localResourcePath.ts`, `src/desktop/main.ts:398-400`
- Risk: Authenticated clients can open arbitrary local paths via Runtime capability. Normalization rejects empty/null-byte but allows absolute and UNC paths; no denylist (e.g. sensitive system dirs). Native-host non-Windows `spawn(command, [resourcePath])` uses raw input rather than `normalized.path` (Windows path is correct). Desktop `shell:open-external` accepts any `z.url()` including non-http schemes unless Electron blocks them.
- Recommendation: Always open `normalized.path`; restrict `openExternal` to `http:`/`https:` (and maybe `mailto:`); document intentional “user-agent open any path” threat model; optional allowlist later.

### F9 — Severity: medium
- Area: Dual Runtime start / retire race
- Evidence: `src/desktop/ensureDesktopRuntime.ts:132-192`, `src/desktop/ensureDesktopRuntime.ts:83-88`, `src/cli/main.ts:270-305`
- Risk: Incompatible Runtime retire uses authenticated shutdown + wait up to 8s; on timeout only warns, then spawn proceeds. CLI `open` and Desktop embed can race; lock layer usually serializes, but timeout-after-shutdown-fail can leave user in attach race / confusing errors. Desktop schema attach uses `schemaVersion < required` only (not reject newer-than-client).
- Recommendation: If retire times out, fail closed with actionable message instead of spawn; reject discovery when `schemaVersion > client` as well as `<`; document stop/retry path in error dialog (already partly present).

### F10 — Severity: medium
- Area: Native Messaging input bounds
- Evidence: `src/native-host/messageCodec.ts:11-28`, `src/native-host/main.ts:16-53`
- Risk: Frame length is `uint32` with no max; malicious/buggy extension can force huge allocation. JSON.parse on full body without size cap. Handler chain serializes (good) but OOM is a local DoS of the host process.
- Recommendation: Cap body (e.g. 1–2 MiB, align with HTTP `MAX_JSON_BODY_BYTES`); reject oversized frames with error response and reset buffer.

### F11 — Severity: medium
- Area: baseRevision / multi-client concurrency
- Evidence: `src/core/contracts/runtimeProtocol.ts` (optional baseRevision), `src/client/runtimeClient.ts:151-158`, architecture SoT: “baseRevision v1 advisory”; server never compares baseRevision in `httpServer` command path
- Risk: Concurrent clients last-write-wins; undo stacks can surprise users; silent overwrite of concurrent edits. Documented for v1 but still a robustness gap for multi-surface use.
- Recommendation: Keep advisory for v1; log revision mismatch metrics; plan OCC reject (`revision_conflict`) when product prioritizes multi-editor safety.

### F12 — Severity: medium
- Area: SQLite busy / resource cleanup edges
- Evidence: `src/runtime/database.ts:22-25` (foreign_keys + WAL only), no `busy_timeout`; `src/runtime/index.ts:271-294` stop path closes SSE/HTTP/DB and removes lock/discovery
- Risk: Stop path is good. Without `busy_timeout`, rare contention (external reader of WAL/DB file) surfaces as throw → 500. No Runtime request timeout: a stuck handler holds CommandQueue forever.
- Recommendation: Set `PRAGMA busy_timeout`; optional per-command timeout on queue; ensure stop aborts in-flight work.

### F13 — Severity: low
- Area: Diagnostics / health information disclosure
- Evidence: `src/runtime/httpServer.ts:120-131` (public health), `src/runtime/httpServer.ts:432-458` (auth’d diagnostics with `dbPath`)
- Risk: Public health leaks pid/startedBy/schemaVersion (acceptable for lock recovery). Authenticated diagnostics expose absolute `dbPath` and client list — fine for local steward, still broader than minimum for every token-holding client (including Web after exchange).
- Recommendation: Split steward diagnostics vs client-safe status; avoid path disclosure to non-steward sessions if session tokens are split later.

### F14 — Severity: low
- Area: Swallow / silent patterns
- Evidence: `src/client/runtimeClient.ts:335-338` (bye best-effort), `src/client/runtimeClient.ts:581-585` (event apply error logged only), `src/runtime/lock.ts:55-57` corrupt lock → null, several `// ignore` close paths
- Risk: Mostly intentional fail-soft for disconnect cleanup. Corrupt discovery/lock returns null without log — can look like “Runtime not running” when file is garbage. Event apply failures only `console.error` with no client recovery/fullCatchUp.
- Recommendation: Log corrupt lock/discovery once; on apply failure trigger fullCatchUp or connection degraded state.

### F15 — Severity: low
- Area: Desktop openExternal / favicon fetch
- Evidence: `src/desktop/main.ts:330-349`, `src/desktop/main.ts:398-400`
- Risk: Favicon fetch has timeout and size caps (good). openExternal lacks scheme allowlist (see F8). IPC Zod helps but does not constrain protocol.
- Recommendation: Scheme allowlist in Main before `shell.openExternal`.

## Boundary / trust map

| Boundary | Untrusted input | Validation / enforcement | Fail mode |
| --- | --- | --- | --- |
| Runtime HTTP (loopback) | Method, path, headers, JSON body, Origin | CORS allowlist; Bearer for `/v1/*` except health + exchange; Zod request schemas; 2 MiB body cap; clientId UUID + registry for mutations/events | 403 cors, 401 auth, 400 invalid_payload, 500 internal |
| auth.exchange | oneTimeCode | Zod + single-use map + TTL | 401 if invalid/expired |
| auth.bootstrap | Bearer process token | Same as other /v1 routes | 401 |
| discovery.json | File content on disk | Zod strict schema; min token length 32 | null → treat as unavailable |
| runtime.lock | File content | Zod; health/pid/status rules | stale clean or held |
| SSE events | Stream bytes | `runtimeEventSchema.safeParse`; drop invalid | reconnect loop |
| RuntimeClient HTTP | Server JSON | Response Zod schemas; RuntimeClientError codes | throw to UI |
| Desktop IPC | Renderer invoke payloads | Zod in Main + preload | throw / parse fail |
| Desktop preload injection | Main sync config | `desktopRuntimeConfigSchema`; missing → `__CARDO_RUNTIME_MISSING__` | fail closed |
| Native Messaging stdin | Length-prefixed JSON | Zod request schema; no max frame size (gap) | error response |
| Extension NM | Host response | Zod response schema | typed discover errors |
| openLocalResource | Path string | normalize (empty/null); existence on win32; then OS open | false / error message |
| openExternal (Desktop) | URL string | `z.url()` only | Electron may still open odd schemes |
| GitHub updates | Release JSON + binary | Zod release; optional SHA256; size fallback | error state or fail-open without hash |
| Static `/app` files | URL path | resolve under root; null-byte reject | 403 / 404 |

Trust model assumption: same OS user who can read `%APPDATA%/cardo/discovery.json` or NM host output is a full peer of the Runtime. This is appropriate for a personal local hub, not multi-user shared-machine isolation.

## Logging inventory

| Surface | Destination | What is logged | Gaps |
| --- | --- | --- | --- |
| Runtime HTTP | Metrics counters only (`corsRejectedCount`, `authFailCount`, `lastMutationAt`) via diagnostics | No access log | Cannot reconstruct failed command sequences |
| Runtime start/stop | Lock/discovery files; child appends few lines to `runtime.log` | PID, baseUrl on child ready | No structured lifecycle in library `startRuntime` itself |
| CLI | stdout/stderr | serve/status/stop/open human text | No log levels; token never printed (good) |
| Desktop Main | console; debug package → `userData/logs/debug.log` | attach/embed, tray, update warnings, load URL | Production lacks file log and unhandledRejection |
| runtime-child | `runtime.log` + stderr | start/ready/fail | No HTTP-level detail |
| native-host | `%LOCALAPPDATA%/cardo/native-host.log` (win) or `~/.cardo/native-host.log` | request types, discover, open-failed | Paths may appear in open diagnostics |
| Extension / Web UI | `console.error` | command fail, bootstrap fail, error boundary | No remote telemetry (OK for local product); support relies on user screenshots |
| `src/core/log.ts` | console | debug/warn only in Vite DEV; error always | Runtime Node paths do not use this helper |

Secrets hygiene: code paths reviewed avoid logging Bearer tokens and one-time codes in CLI open messaging. Diagnostics must not gain token fields later. Native-host diagnostics may include local paths (PII/path disclosure to anyone with log file access).

## Top 10 hardening actions (priority ordered)

1. Fail closed when GitHub release has no usable SHA256 for the chosen asset; re-verify hash at install time (`src/desktop/update/githubReleaseClient.ts`, `desktopUpdater.ts`).
2. Map domain/command failures to stable 4xx error codes instead of 500 `internal_error` (`httpServer.ts` + thin error type from command handlers).
3. Make `RuntimeClient.connect()` fail on first-ready timeout; never mark UI connected without stream ready (`runtimeClient.ts`, `hostPlatform.ts`).
4. Add process-level unhandledRejection/uncaught handlers for Runtime child, CLI serve, and packaged Desktop Main; always clean lock/discovery on fatal exit.
5. Write structured Runtime lifecycle + command outcome logs to `logPath` without secrets (`startRuntime` / `httpServer` / queue).
6. Cap Native Messaging frame size and always open `normalized.path` on all platforms (`messageCodec.ts`, `openLocalResource.ts`).
7. Restrict Desktop `shell:open-external` to http(s) (and explicit extras); keep local open separate (`main.ts`).
8. On incompatible Runtime retire timeout, fail closed with stop/retry guidance rather than spawn-anyway (`ensureDesktopRuntime.ts`).
9. Attach schema compatibility as exact or bidirectional range (reject newer Runtime from older client), not only `schemaVersion < required`.
10. Plan OCC or conflict UX for multi-client (`baseRevision` enforce or soft warn) once multi-surface editing is common; until then, emit diagnostics metrics when client baseRevision ≠ server revision after command.

## Appendix — grep signal summary

- Empty catch `{}`: none found under `src/`.
- `unhandledRejection` / process monitors: Desktop debug package only; CLI/runtime-child SIGINT/SIGTERM only.
- `as any` / `@ts-ignore` / TODO/FIXME/HACK under `src/`: no matches in this pass.
- `console.*`: concentrated in Desktop ensure/main/update, RuntimeClient event apply, web-next stores/bootstrap; Runtime HTTP itself is nearly silent.
- Intentional best-effort swallows: client `bye`, lock/discovery unlink, event write failures, update checksum fetch catch → `sha256 = null` (problematic, F3).

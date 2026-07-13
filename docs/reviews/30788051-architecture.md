# Architecture review (30788051)

| Field | Value |
| --- | --- |
| Branch tip | `feature/hover-tip` (includes main hardening + hover tip + AGENTS frontend norms) |
| Date | 2026-07-13 |
| Scope | Runtime sole SQLite; clients via RuntimeClient/Zod; Command single txn; no OPFS / `database:execute`; no electron in runtime; Zod SoT; no soft-compat schema; attach-first; path SoT; revision/invalidation; doc drift; recent fixes |
| Surfaces | `src/runtime`, `src/core`, `src/client`, `src/desktop`, `src/extension`, `src/cli`, `src/native-host`, `src/web-next/platform` |
| SoT | `AGENTS.md`, `docs/architecture/local-runtime-multi-client.md` |
| Method | Grep + read critical paths; re-verify prior review `f432f78a` findings F1–F2 and related fixes |
| Prior review | `docs/reviews/f432f78a-architecture.md` |

## Executive judgment

The multi-client Runtime spine is solid and matches the architecture SoT. Cardo Runtime is the sole `node:sqlite` authority; CLI / Web / Extension / Desktop are symmetric clients over Zod-validated HTTP + fetch stream; Desktop attaches first or spawns a detached Runtime child and never hosts the DB in Main; Native Host stays thin (discover + optional local open, never opens SQLite); `hostPlatform` is RuntimeClient-only and fail-closed.

Compared with `f432f78a-architecture.md`, the two high-severity multi-client defects are fixed in code:

1. Session lifecycle (prior F1): stream close no longer unregisters the client; idle sweep / `session.bye` end sessions; client rebinds via re-`hello` when events return an invalid client id.
2. SQLite serialization (prior F2): query, export, revision reads, and mutations all enqueue on the same `CommandQueue`, so one `DatabaseSync` connection is not interleaved across concurrent HTTP handlers.

Also closed from that review: `ensurePreferencesThemeColumns` soft repair (removed; migrator is forward-only), hand `DatabaseCommandResult` dual type (now `z.infer` from wire schema), and major SoT dual-DB / wrong-module / schema-ceiling doc drift (architecture doc dated 2026-07-13 aligns with module map and Hard Decisions).

Remaining gaps are policy edges, not spine failures: dual local-open shell paths (Runtime capability vs NM/Desktop AppPorts), mutating HTTP without auto-rebind after idle expiry, a stale `discovery.revision` snapshot, and a few low-severity protocol / recovery-copy leftovers. No critical architectural violation found on this tip.

## SoT compliance matrix

| Pillar | Status | Evidence paths | Notes |
| --- | --- | --- | --- |
| Runtime sole SQLite authority; no second writers | met | `src/runtime/database.ts` (`openRuntimeDatabase` only opener under `src/`); grep: no OPFS/sql.js/wa-sqlite writers; extension/hostPlatform comments forbid fallback | Business DB only in Runtime process |
| Clients only via RuntimeClient / Zod protocol | met | `src/client/runtimeClient.ts`; `src/web-next/platform/hostPlatform.ts`; `src/core/contracts/runtimeProtocol.ts` | UI does not import Drizzle schema; web-next greps clean |
| Command Registry + single Drizzle txn + op log + history same txn | met | `src/core/application/executeDatabaseCommand.ts` (handler + op log + history + `bumpRevision` in one `database.transaction`); registry handlers | Empty changes: no op log / no revision bump |
| Query path: typed in-process; clients via protocol | met | In-process: `workspaceQueries.ts` via `httpServer.ts` `dispatchQuery`; client: RuntimeClient query methods | All SQLite queries on `CommandQueue` (prior F2 closed) |
| AppPorts non-DB only | met | `src/core/ports/AppPorts.ts` (no DatabasePort); desktop/extension/web-runtime shell ports | Shell only; business I/O via hostPlatform |
| Runtime must not import electron | met | grep electron under `src/runtime` and `src/core`: none | Desktop Main/preload/update only |
| Zod boundary SoT; z.infer not dual hand interfaces | met | `databaseCommandResultSchema` + `type DatabaseCommandResult = z.infer<…>` in `runtimeProtocol.ts`; `commandTypes.ts` re-exports | Prior F4 closed |
| No old-schema dual-read / soft-compat shims | met | Forward migrator `src/core/database/migrator.ts` (0→3→…→9; 1/2 fail hard); no `ensurePreferencesColumns.ts` on disk | Prior F3 closed; worklog `f432f78a-schema-zod.md` |
| Desktop attach-first embed-if-missing | met | `src/desktop/ensureDesktopRuntime.ts`; `runtimeChild.ts`; Main never `startRuntime` | Embed = detached child + attach |
| Path SoT (`cardo` / `cardo.sqlite`) + lock exclusivity | met | `src/runtime/paths.ts`; lock + discovery; CLI/Desktop shared resolver | No previous-install relocate |
| InvalidationScope + revision fanout | met | `invalidationScopes.ts`; command/history/ensureInitialized publish; RuntimeClient watermarks + fullCatchUp | Server-derived scopes; stream is channel not session |
| Client session: stream close keeps session | met | `src/runtime/clients.ts` `onStreamClose` only clears streaming; Hard Decision 23 / §9 SoT | Prior F1 closed; see residual F1 rebind gap on mutating HTTP |
| Compatibility gate across surfaces | met | `src/core/runtimeCompatibility.ts`; Desktop attach/retire; CLI open; Extension discover | Equality on `DATABASE_SCHEMA_VERSION`; `/app` where UI required |
| Doc vs code drift (architecture SoT) | met / residual archive | `local-runtime-multi-client.md` Status Active SoT, Date 2026-07-13 | Prior dual-DB mermaid/module drift fixed; archive reviews still stale |

### Prior findings F1–F2 status (explicit verify)

| Prior | Status | Current evidence |
| --- | --- | --- |
| F1 SSE unregister on stream close | fixed | `clients.ts` L102–111: `onStreamClose` sets `streaming=false` + touch; does not `unregister`. Unregister only `session.bye` (httpServer L252) or idle sweep (clients L141–153). Client: `runtimeClient.ts` `rebindSession` + invalid-client handling in `runSubscribeLoop` (L537–596). SoT §9.1 matches code. |
| F2 queries off mutation queue | fixed | `httpServer.ts`: mutations, activity, export, export-operation-log, diagnostics/hello/events revision, and `dispatchQuery` SQLite branches all `ctx.queue.enqueue(...)`. FS-only `query.localThemePacks` correctly off-queue. `database.ts` sets `busy_timeout = 5000`. Worklog: `docs/reviews/worklogs/f432f78a-db-errors.md`. |

Residual note (not a reopen of F2): Drizzle still uses async `sqlite-proxy` statements inside a single queued task. Serialization across HTTP handlers is correct; mid-txn yielding cannot admit another Runtime DB task while the queue holds the tail.

## Findings

### F1 — Severity: medium
- Area: Client session rebind on mutating HTTP after idle expiry
- Evidence:
  - Server: non-streaming clients expire after `clientIdleMs` (default 60s) via `ClientRegistry.sweepIdleClients` (`src/runtime/clients.ts` L141–153). Mutating routes reject unregistered `X-Cardo-Client-Id` with 400 (`httpServer.ts` `requireRegisteredClientId` L685–704).
  - Client: `rebindSession()` / `isInvalidClientIdError` only used inside `runSubscribeLoop` after events failure (`src/client/runtimeClient.ts` L537–596). `command` / `historyUndo` / `historyRedo` / `ensureInitialized` use `postJson` with no invalid-client retry (`L154–217`, `L686–701`).
- Risk: After stream drop + idle timeout (sleep, long background tab), the first user mutation can fail with 400 until the subscribe loop rebinds. UI may look connected (queries do not require registered client id) while writes fail once or until reconnect completes.
- Recommendation: On 400 invalid client id for mutating posts, call `rebindSession()` once and retry the same request; or keep stream-open as the primary liveness signal and surface a short reconnecting state when rebind is required. Do not reintroduce unregister-on-stream-close.

### F2 — Severity: medium
- Area: Local open dual paths (Runtime capability vs shell / NM)
- Evidence:
  - Product path: `hostPlatform.openLocalResource` → RuntimeClient → `POST /v1/capability/open-local-resource` (`hostPlatform.ts` L393–397; `httpServer.ts` L417–429; hooks in `runtime/capabilities.ts` / `openLocalResourceHook.ts`).
  - Still present: Native Host `open-local-resource` (`handleNativeHostRequest.ts` L28; `native-host/openLocalResource.ts`); Extension `nativeMessagingLocalResourcePort.ts`; Desktop AppPorts / preload `shell:open-local-resource` IPC (`preload.ts` L72–77; `main.ts` IPC handler).
  - SoT §8 acknowledges NM direct open as non-DB auxiliary; `runtime.relay` not implemented (grep: no matches under `src/`).
- Risk: Not a second SQLite writer. Two shell open implementations can diverge on path validation and error UX; Extension COEP/CORS-blocked HTTP has no Runtime relay fallback. Policy dual-path debt carried from prior F5.
- Recommendation: Keep Runtime capability as sole business open path used by UI; document NM/Desktop ports as shell fallbacks only or delete NM open once unused; implement NM relay only if HTTP is proven blocked.

### F3 — Severity: low
- Area: `discovery.json` revision snapshot never refreshed
- Evidence:
  - Written once at ready in `startRuntime` (`src/runtime/index.ts` L305–315) with `getRevision` at that moment.
  - Mutations bump `runtime_meta.revision` and fan out SSE; they do not rewrite discovery.
  - NM `runtime.discover` returns `discovery.revision` (`handleNativeHostRequest.ts` L70); Extension maps it through (`discoverRuntime.ts`).
- Risk: Low. Authoritative revision for clients comes from `hello.ok` / events / diagnostics. Stale discovery revision can confuse operators or any future code that treats discover revision as live SoT.
- Recommendation: Either stop advertising revision on discover (or mark advisory/start-only in protocol comments), or rewrite discovery revision on successful mutations (rate-limited). Prefer not treating file revision as live.

### F4 — Severity: low
- Area: InvalidationScope `pageTabsAndState` never emitted
- Evidence:
  - Wire + client: `runtimeProtocol.ts` L28; `workspaceStore.ts` handles `pageTabsAndState`.
  - Server: `deriveInvalidationScopes` never emits it (`invalidationScopes.ts` L25–27); multi-table page+state falls through to `projection`.
  - SoT §10.3 documents this as allowed over-wide strategy.
- Risk: Dead wire variant; harmless over-wide projection. Not a correctness bug.
- Recommendation: Either emit `pageTabsAndState` for page create+state or remove the scope from the protocol if permanently unused. Until then keep SoT note.

### F5 — Severity: low
- Area: Recovery / error-screen copy vs architecture policy
- Evidence:
  - `src/web-next/ui/cardo\error-screen.ts` hardcodes discovery `schemaVersion is 9` (zh/en steps) instead of interpolating `DATABASE_SCHEMA_VERSION`.
  - Hints still say upgrade “migrates preferences columns automatically” (soft-repair language) after ensurePreferences removal.
- Risk: User-facing drift after schema bumps; implies a retired soft-compat path. Desktop main recovery already interpolates `DATABASE_SCHEMA_VERSION` (compat worklog). Architecture gate itself is correct.
- Recommendation: Interpolate `DATABASE_SCHEMA_VERSION`; drop soft-repair wording; keep stop-Runtime / rebuild / reattach steps.

### F6 — Severity: low
- Area: Stale comment in hostPlatform session wording
- Evidence:
  - `src/web-next/platform/hostPlatform.ts` L168: “Stream onStreamClose remains primary unregister if bye fetch is torn down mid-close.”
  - Server: stream close does not unregister (`clients.ts` L102–111). Client `close()` does best-effort `session.bye` (`runtimeClient.ts` L343–355). Idle sweep is the server-side fallback when bye never arrives.
- Risk: Contributor confusion only; can reintroduce F1-class “unregister on stream end” thinking.
- Recommendation: Update comment to: pagehide → `client.close()` → `session.bye`; server idle sweep if bye lost; stream close is not session end.

## Doc drift

| Doc / artifact | vs code on this tip |
| --- | --- |
| `docs/architecture/local-runtime-multi-client.md` | Largely aligned (2026-07-13): sole Runtime writer, Path SoT, attach-first detached child, session stream-vs-idle (§9), module map under `core/` for revision/scopes, schema 9 path, no soft repair. Treat as SoT. |
| Same §8 NM open / no `runtime.relay` | Matches code; still dual shell open (see F2). Not silent dual-DB. |
| `docs/reviews/f432f78a-architecture.md` | Historical: F1–F4 open there; this tip fixes F1–F4 spine items. Do not treat as current status. |
| `docs/reviews/archive/comprehensive-health-review-2026-07-12.md` | Archive; still lists ensurePreferences / SSE / DB mutex as open. Superseded for those items by worklogs under `docs/reviews/worklogs/f432f78a-*.md`. |
| Worklogs `f432f78a-session-client.md`, `f432f78a-db-errors.md`, `f432f78a-schema-zod.md`, `f432f78a-compat.md` | Match current code for their slices. |
| Recovery copy `error-screen.ts` | Product copy drift (F5), not architecture SoT file drift. |

## Keep / change

### Keep (architecture spine)

1. Single Runtime process as SQLite authority: `openRuntimeDatabase` + exclusive lock (`starting` → ready) + discovery secrets file.
2. Path SoT: `cardo` / `cardo.sqlite` via `resolveCardoDataPaths`; Desktop name/`userData` aligned with `CARDO_USER_DATA_DIR_NAME`.
3. Command Registry + `executeDatabaseCommand` single txn (handler + op log + history + `bumpRevision`); history undo/redo also +revision forward-only; `activity.record` on queue without revision.
4. Unified `CommandQueue` for all SQLite access (mutations + queries + export + revision reads).
5. Server-derived `deriveInvalidationScopes` + mutation SSE with `sourceClientId`; client initiator apply from HTTP ok + self-echo ignore + revision watermarks + fullCatchUp.
6. Session model: stream is channel; `clientId` until bye or idle; reconnect reuses id within idle window; re-hello when id dead.
7. Symmetric clients: Web code-exchange / session, Extension NM discover inject, Desktop preload inject — all RuntimeClient, fail-closed, no local DB.
8. Desktop attach-first, embed-if-missing as detached child; quit does not kill others’ Runtime; schema equality + `/app` gate via `assertRuntimeCompatible`.
9. AppPorts for non-DB shell only; no `database:execute` IPC (preload is window/clipboard/shell/update only).
10. Forward-only migrator with hard fail on unsupported versions; Zod contracts as wire SoT; no ensurePreferences soft repair.
11. Runtime core free of electron imports; host capabilities via hooks.

### Change (targeted, not a rewrite)

1. Auto-rebind (or single retry) on mutating RuntimeClient calls when client id is invalid (F1) — highest residual multi-client correctness edge.
2. Collapse or clearly fence dual local-open paths (F2).
3. Clarify or stop publishing live-looking `discovery.revision` (F3).
4. Emit or delete `pageTabsAndState` (F4).
5. Fix error-screen schema version interpolation and soft-repair wording (F5); fix hostPlatform unregister comment (F6).

### Do not change

- Do not reintroduce Extension OPFS or Desktop business SQL IPC.
- Do not add CRDT / dual-writer sync / full Workspace Snapshot as multi-client protocol.
- Do not move business writes into AppPorts or Renderer.
- Do not unregister clients on stream close.
- Do not reintroduce soft column repair beside the forward migrator.
- Do not put electron imports into `src/runtime` or `src/core`.
- Do not replace RuntimeClient stream design wholesale; extend rebind coverage for mutations only.

### Recent fixes verified (this tip / main hardening)

| Fix | Status | Paths / notes |
| --- | --- | --- |
| Session on stream close | fixed | `clients.ts` onStreamClose; SoT Hard Decision 23 / §9 |
| DB queue (queries + export) | fixed | `httpServer.ts` enqueue; `commandQueue.ts`; worklog db-errors |
| Compatibility gate | fixed | `runtimeCompatibility.ts` + Desktop/CLI/Extension callers; worklog compat |
| ensurePreferences removed | fixed | No `ensurePreferencesColumns.ts`; migrator has no soft repair call |
| DatabaseCommandResult z.infer | fixed | `runtimeProtocol.ts` + re-export in `commandTypes.ts` |
| Architecture SoT rewrite | fixed | `local-runtime-multi-client.md` Active SoT 2026-07-13 |

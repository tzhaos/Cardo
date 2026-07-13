# Architecture review (f432f78a)

## Executive judgment

Cardo’s multi-client Runtime spine is real in code, not aspirational: a single `node:sqlite` opener, exclusive lock + discovery, Zod-validated HTTP, Command Registry mutations in one Drizzle transaction with op log / history / revision, and symmetric clients through `RuntimeClient` / `hostPlatform`. Second writers (Extension OPFS, Desktop `database:execute`) are gone; Runtime does not import electron; Desktop correctly attaches or spawns a detached Runtime child rather than embedding the DB in Main.

The remaining gaps are policy edges and multi-client correctness under disconnect/load: SSE stream close fully unregisters the client while reconnect does not re-`hello`; queries/export share the same `DatabaseSync` outside the mutation queue; a post-migrate preferences column soft-repair contradicts AGENTS “no old-schema compatibility”; and architecture docs still describe dual-DB “现状”, wrong module paths, and incomplete schema version ranges.

## SoT compliance matrix

| Pillar | Status | Evidence paths | Notes |
| --- | --- | --- | --- |
| Runtime sole SQLite authority; no second writers | met | `src/runtime/database.ts` (`openRuntimeDatabase` only `DatabaseSync` opener under `src/`); `src/web-next/platform/hostPlatform.ts` fail-closed; extension discover comments; grep: no OPFS/sql.js/wa-sqlite writers | Business DB only in Runtime process |
| Clients only via RuntimeClient / Zod protocol | met | `src/client/runtimeClient.ts`; `src/web-next/platform/hostPlatform.ts`; `src/core/contracts/runtimeProtocol.ts` | UI does not import Drizzle schema / DatabasePort |
| Command Registry + single Drizzle txn + op log + history same txn | met | `src/core/application/executeDatabaseCommand.ts` L38–75; `databaseCommandRegistry.ts`; `historyEngine.ts` | Empty changes: no op log / no revision bump |
| Query path: typed in-process; clients via protocol | partial | In-process: `src/core/database/workspaceQueries.ts` via `httpServer.ts` `dispatchQuery`; client: `RuntimeClient` query methods | Queries not on CommandQueue; concurrent with mutating async txn on one connection |
| AppPorts non-DB only | met | `src/core/ports/AppPorts.ts` (no DatabasePort); surface ports under desktop/extension/web-runtime | Shell only; business I/O via hostPlatform |
| Runtime must not import electron | met | grep electron under `src/runtime` and `src/core`: none; Desktop Main/preload separate | Runtime child runs `ELECTRON_RUN_AS_NODE` without electron imports |
| Zod boundary SoT; z.infer not dual hand interfaces | partial | Contracts use `z.infer`; `databaseCommandResultSchema` in `runtimeProtocol.ts` | Hand `DatabaseCommandResult` in `commandTypes.ts` duplicates wire schema |
| No old-schema dual-read / compat shims | partial | Forward migrator `src/core/database/migrator.ts` (0→3→…→9; 1/2 fail hard) | `ensurePreferencesThemeColumns` post-version ADD COLUMN repair |
| Desktop attach-first embed-if-missing | met | `src/desktop/ensureDesktopRuntime.ts`; `runtimeChild.ts`; tray quit does not stop Runtime | Embed = detached child + attach; Main never hosts DB (allowed simplification in design §6.6.1) |
| Path SoT (`cardo` / `cardo.sqlite`) + lock exclusivity | met | `src/runtime/paths.ts`; `lock.ts` `wx` + starting grace; `discovery.ts` holds token only; Desktop `app.setName(CARDO_USER_DATA_DIR_NAME)` | Path SoT clean; no relocate shim |
| InvalidationScope + revision fanout | partial | `invalidationScopes.ts`; `httpServer.ts` command/history/ensureInitialized publish; client watermarks in `runtimeClient.ts` | Server-derived scopes good; stream close vs reconnect clientId broken |
| Doc vs code drift | partial | See Doc drift section | Dual-DB mermaid, module table, schema “to 5”, Main-in-process embed diagram |

## Findings

### F1 — Severity: high
- Area: Invalidation / client session lifecycle (SSE reconnect)
- Evidence:
  - `src/runtime/httpServer.ts` L624–629: event stream `onClose` → `clients.onStreamClose(clientId)`.
  - `src/runtime/clients.ts` L102–109: `onStreamClose` fully `unregister`s the client.
  - `src/client/runtimeClient.ts` L516–558: reconnect loop reuses `selfClientId` and only re-GETs `/v1/events`; no re-`hello()`.
  - `requireRegisteredClientId` (httpServer L671–687) rejects unregistered ids with 400 for commands, history, ensureInitialized, events, and openLocalResource (client requires client id).
- Risk: Any stream drop (laptop sleep, proxy, Runtime brief restart attach race, idle network) permanently breaks mutations and event subscription until full app reload. Multi-client live sync silently dies; UI may still run queries (they do not require client id) and look “half connected.”
- Recommendation: On reconnect, client must `hello()` again, replace `selfClientId`, then subscribe; or server must keep the session on stream close (mark non-streaming + idle timeout) and only unregister on `session.bye` / idle. Align design §6.6.1 with §6.10 (currently “unregister or mark inactive” vs reconnect without re-hello).

### F2 — Severity: high
- Area: Single `DatabaseSync` + async multi-statement txn vs concurrent queries
- Evidence:
  - Mutations serialized only via `CommandQueue` (`httpServer.ts` command/history/ensureInitialized/activity).
  - Queries and workspace export call Drizzle directly off-queue (`dispatchQuery` L545–608; export L391–400).
  - `executeDatabaseCommand` uses `database.transaction(async …)` with many `await`s (`executeDatabaseCommand.ts` L38–75); drizzle sqlite-proxy issues discrete SQL through `DatabasePort.execute` (`createDatabaseClient.ts` L6–17; `database.ts` L53–76).
  - One connection (`openRuntimeDatabase`), WAL on, no DB-level busy queue beyond process exclusivity.
- Risk: Between awaits of an open mutation transaction, another HTTP handler can run SELECTs on the same connection (see in-flight dirty state) or interleave statements; multi-statement projections can tear across a commit boundary. Under multi-client load this is a real integrity/consistency bug class, not theoretical only.
- Recommendation: Route all DB access (query + export + mutation) through one serial executor, or use a dedicated read connection/snapshot policy with documented isolation. Prefer sync DB adapter inside the queue so a mutation txn does not yield the event loop mid-BEGIN.

### F3 — Severity: medium
- Area: AGENTS “no old schema compatibility” vs preferences column soft repair
- Evidence:
  - `src/core/database/ensurePreferencesColumns.ts` L1–10, L61–70: idempotent `ALTER TABLE … ADD COLUMN` when columns missing after version advanced.
  - Called unconditionally at end of `applyMigrations` (`migrator.ts` L86–91), then may force `user_version` to CURRENT (L93–95) outside the N→N+1 step transactions.
- Risk: Masks incomplete/interrupted migration and invents a second schema-repair path beside forward SQL steps. Contradicts AGENTS §4 and design Hard Decision 10. Can hide bugs that should fail hard.
- Recommendation: Delete the shim; if field data exists with wrong version, add a real forward migration or fail hard with a clear “run repair once / restore backup” message. Do not leave permanent soft ADD COLUMN.

### F4 — Severity: medium
- Area: Zod SoT dual type for command results
- Evidence:
  - Wire: `databaseCommandResultSchema` in `src/core/contracts/runtimeProtocol.ts` L42–48.
  - Hand interface: `DatabaseCommandResult` in `src/core/application/commandTypes.ts` L6–10 (same fields, not `z.infer`).
  - Used by execute path, RuntimeClient, and workspaceStore.
- Risk: Drift if one side gains a field (export, error codes, created ids). Policy prefers single `z.infer` boundary type.
- Recommendation: `export type DatabaseCommandResult = z.infer<typeof databaseCommandResultSchema>` from contracts; delete hand interface.

### F5 — Severity: medium
- Area: Local open dual paths (Runtime capability vs shell/NM)
- Evidence:
  - Authoritative product path: `hostPlatform.openLocalResource` → Runtime `POST /v1/capability/open-local-resource` (`hostPlatform.ts` L393–397; `httpServer.ts` L412–424).
  - Still present: Native Host `open-local-resource` direct open (`handleNativeHostRequest.ts` L28; `native-host/openLocalResource.ts`); Extension `AppPorts.localResource` = NM port; Desktop AppPorts.localResource = Main `shell.openPath` IPC.
  - Design §6.4.1 marks NM direct open as transitional / PR6 delete intent; `runtime.relay` is not implemented (grep: no matches under `src/`).
- Risk: Two shell open implementations diverge on validation and error UX; Extension COEP/CORS blocked HTTP has no relay fallback to Runtime protocol. Not a second SQLite writer, but policy dual-path debt.
- Recommendation: Keep Runtime capability as sole business open path; drop or hard-deprecate NM direct open once Extension only uses Runtime; implement NM relay only if HTTP is proven blocked.

### F6 — Severity: low
- Area: Doc module layout vs implementation
- Evidence:
  - Design table lists `src/runtime/revision.ts` and `src/runtime/invalidation.ts` (`local-runtime-multi-client.md` ~L232–234); actual code is `src/core/database/revision.ts` and `src/core/application/invalidationScopes.ts`.
  - Migrator comment in design still says “Desktop opener / Extension Worker / Runtime 共用” while clients never run migrator (`migrator.ts` header: clients never run this path).
- Risk: Contributors reintroduce dual openers or look for the wrong packages.
- Recommendation: Rewrite §6.2 inventory to match current trees; state “migrator only via openRuntimeDatabase.”

### F7 — Severity: low
- Area: InvalidationScope `pageTabsAndState` never emitted
- Evidence:
  - Protocol includes `pageTabsAndState` (`runtimeProtocol.ts` L28); client handles it (`workspaceStore.ts`).
  - Server `deriveInvalidationScopes` never emits it (comment L25–27: multi-table page+state → projection).
- Risk: Dead wire variant; harmless over-wide projection when page create also touches `app_state`.
- Recommendation: Either emit `pageTabsAndState` for page create+state or remove the scope from the protocol if permanently unused.

### F8 — Severity: low
- Area: `activity.record` write shape vs mutation txn discipline
- Evidence:
  - On CommandQueue and no revision bump (`httpServer.ts` L370–388) — matches design.
  - `recordDatabaseActivity` single insert without explicit transaction wrapper (`operationLogService.ts` L11–26).
- Risk: Low; single statement. Fine unless batching is added later without a txn.
- Recommendation: Keep queue; if multi-row activity appears, wrap in transaction.

### F9 — Severity: low (policy polish)
- Area: Desktop tray copy Chinese-only; product i18n not architecture core
- Evidence: `src/desktop/main.ts` tray labels (~L284–307).
- Risk: Non-architecture; noted because comprehensive-health-review still flags it and attach lifecycle UX depends on those labels.
- Recommendation: Localize when Desktop i18n is scheduled; keep dual quit actions (quit vs quit+stop Runtime).

## Doc drift

| Doc | Contradiction with code |
| --- | --- |
| `docs/architecture/local-runtime-multi-client.md` §3.1 | Mermaid still shows Desktop Main→SQLite and Extension OPFS worker as topology; prose mixes “当前问题” with “历史状态”. Code is single Runtime writer only. |
| Same §3.1 item 6 | Wild migrate “to 5”; code `DATABASE_SCHEMA_VERSION = 9` with steps 4…9 (`version.ts`, `migrator.ts`). |
| Same §6.2 table | `runtime/revision.ts`, `runtime/invalidation.ts` do not exist; logic lives under `core/`. |
| Same §6.2 migrator row | Claims Extension Worker co-opener; no Extension opener. |
| Same §6.6 mermaid | “Main 内 startRuntime”; code only detached `runtime-child` + attach (`ensureDesktopRuntime.ts` L7–8, L36–38). Detached path is allowed by §6.6.1 but primary diagram is outdated. |
| Same §6.4 / NM | Optional `runtime.relay` specified; not implemented. NM still hosts direct `open-local-resource`. |
| Same §6.9.2 note | “local 模式可暂保留 getCommandRefreshScope 直至 PR6”; local mode / CARDO_USE_RUNTIME gone; hostPlatform is Runtime-only. |
| `docs/architecture/comprehensive-health-review.md` | Largely aligned (2026-07-12) on sole Runtime authority; still useful for debt lists. Verify individually: F1/F2 still open; some UI/i18n items may have moved. Treat as review artifact, not Path/protocol SoT. |
| `docs/architecture/zod-drizzle-shadcn-refactor.md` | Not re-audited line-by-line; health review notes stale checkboxes for finished work — expect drift. |

## Keep / change

### Keep (architecture spine)

1. Single Runtime process as SQLite authority: `openRuntimeDatabase` + exclusive lock (`starting` → ready) + discovery secrets file.
2. Path SoT: `cardo` / `cardo.sqlite` via `resolveCardoDataPaths`; Desktop `app.setName('cardo')`.
3. Command Registry + `executeDatabaseCommand` single txn (handler + op log + history + `bumpRevision`); history undo/redo also +revision forward-only.
4. Server-derived `deriveInvalidationScopes` + mutation SSE with `sourceClientId`; client initiator apply from HTTP ok + self-echo ignore + revision watermarks + fullCatchUp.
5. Symmetric clients: Web code-exchange / session, Extension NM discover inject, Desktop preload inject — all RuntimeClient, fail-closed, no local DB.
6. Desktop attach-first, embed-if-missing as detached child; quit does not kill others’ Runtime; explicit tray “退出并停止 Runtime.”
7. AppPorts for non-DB shell only; no `database:execute` IPC (preload is window/clipboard/shell/update only).
8. Forward-only migrator with hard fail on unsupported versions; Zod contracts as wire SoT.

### Change (targeted, not a rewrite)

1. Fix client session after stream close (F1) — highest multi-client correctness fix.
2. Serialize or isolate all SQLite access against the mutation txn (F2).
3. Remove `ensurePreferencesThemeColumns` soft repair; repair via real migration or fail hard (F3).
4. Collapse `DatabaseCommandResult` to `z.infer` (F4).
5. Close local-open dual path / document NM as discover-only (F5).
6. Refresh architecture SoT sections that still show dual-DB, Extension Worker migrator, in-Main embed, and schema version ceiling 5 (doc drift).
7. Optional: dependency lint forbidding `web-next` → drizzle schema and `runtime` → electron (health review backlog).

### Do not change

- Do not reintroduce Extension OPFS or Desktop business SQL IPC.
- Do not add CRDT / dual-writer sync / full Workspace Snapshot as multi-client protocol.
- Do not move business writes into AppPorts or Renderer.
- Do not replace RuntimeClient stream design wholesale; fix session rebind and DB serialization edges.

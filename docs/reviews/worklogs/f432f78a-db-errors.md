# Worklog: SQLite queue serialization + domain 4xx mapping (f432f78a)

Date: 2026-07-13  
Branch: `fix/runtime-hardening-cleanup-docs`  
Addresses review F1 (domain failures as opaque 500) and first-principles single-connection interleaving.

## Goals

1. Serialize all SQLite access on one queue (one `DatabaseSync` connection).
2. Map domain command failures to stable 4xx instead of generic 500.
3. Set `busy_timeout` on open.

## Changes

### `src/runtime/database.ts`

After WAL pragma:

```ts
raw.exec('PRAGMA busy_timeout = 5000');
```

### `src/core/application/domainError.ts` (new)

`DomainCommandError` with codes:

- `not_found` → 404
- `conflict` → 409
- `precondition_failed` / `invalid_command` → 400 (default)

### `src/runtime/httpServer.ts`

- Top-level `handleRequest` catch: `DomainCommandError` → `sendJson(status, errorBody(code, message))`.
- DB reads routed through `ctx.queue.enqueue(...)`:
  - `dispatchQuery` body (all SQLite queries)
  - GET `/v1/workspace/export`
  - GET|POST `/v1/workspace/export-operation-log`
  - `getRevision` on hello, diagnostics, and events `ready`
- Mutations (command / history / ensure-initialized / activity) already used the queue; domain errors bubble to the outer catch.
- `query.localThemePacks` stays outside the queue (filesystem scan only).

### Command handlers

Business precondition / not-found / invalid-command throws converted to `DomainCommandError` in:

- `pageCommandHandlers.ts`
- `itemCommandHandlers.ts`
- `boxCommandHandlers.ts`
- `workspaceCommandHandlers.ts` (import missing collection view)

Left as plain `Error` (still 500): app state / preferences not initialized, placement rewrite invariant (internal corruption / programming errors).

## Not touched

clients session, runtimeClient, desktop update, ensurePreferences, docs except this worklog.

## Verification

Not run (`Agents.md`: no tests unless user-specified build). Recommend `npm run build` or `npm run build:all` on the task branch before merge.

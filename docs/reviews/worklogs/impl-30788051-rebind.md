# Worklog: mutating HTTP rebind on idle client expiry

Branch: `feature/hover-tip`

## Problem

Event stream reconnect already re-hello'd when Runtime returned 400 invalid `X-Cardo-Client-Id` (idle sweep / unknown id) via `rebindSession()`. Mutating HTTP (`command`, `history`, `ensureInitialized`, `openLocalResource` with `requireClientId: true`) still failed hard on the same error after the session id expired, forcing a full shell reload.

## Changes

### `src/client/runtimeClient.ts`

- Added `withInvalidClientIdRetry(attempt)`: on `isInvalidClientIdError`, call `rebindSession()` once and re-run `attempt` once. No further retries (second failure propagates).
- `postJson` with `requireClientId: true` uses that helper (covers command / history / ensureInitialized / openLocalResource).
- `postJson` without `requireClientId` does not rebind (hello / activity / bye stay non-recursive; `rebindSession` → `hello` → `postJson` cannot loop).
- `getJson` wraps the same helper defensively if a stale client id header is ever rejected; query routes still use `requireClientId: false` and do not require a bound id.
- Unchanged: event-stream rebind path, first-ready fail-closed (`ready_timeout` / stream failure before ready still rejects waiters).

## Principles applied

- Idle expiry is session rebind, not a permanent client failure.
- One rebind + one retry only; avoid infinite retry loops.
- Query paths stay unbound; mutating paths that send a registered client id recover like the SSE loop.
- First connect still fail-closed on missing `ready`.

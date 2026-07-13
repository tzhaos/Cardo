# Worklog: session lifecycle + first-ready fail-closed

Branch: `fix/runtime-hardening-cleanup-docs`

## Problem

1. Server treated event-stream close as session end (`onStreamClose` unregistered the client). Reconnect reused a dead `clientId` and got 400 until full reload.
2. Client treated first-ready as soft-success: timeout resolved, and stream failure before ready also resolved waiters, so `connect()` could return while never receiving `ready`.

## Changes

### `src/runtime/clients.ts`

- `onStreamClose` only sets `streaming=false` and updates `lastSeenAt`.
- Session ends only via idle sweep or `session.bye` (unchanged unregister paths).

### `src/client/runtimeClient.ts`

- First-ready waiters are `{ resolve, reject }` pairs.
- `waitForFirstReady`: timeout rejects with `RuntimeClientError('ready_timeout', ...)`.
- Stream failure before first ready rejects waiters (no soft-success).
- `close()` rejects pending first-ready waiters with `client_closed`.
- Reconnect: if GET `/v1/events` returns 400 invalid client id, `rebindSession()` posts hello, replaces `selfClientId`, then the loop retries events with existing backoff.

## Principles applied

- Stream is a channel; client session is the registered `clientId` until bye or idle timeout.
- "Connected" for first connect requires an actual ready event (fail closed).

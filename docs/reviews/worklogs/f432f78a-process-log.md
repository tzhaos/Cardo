# Worklog: process crash surfaces + Runtime structured log (f432f78a)

Date: 2026-07-13  
Branch: `fix/runtime-hardening-cleanup-docs`  
Addresses review items: F4 (unhandled rejections / process crash surfaces), F6 (minimal Runtime production logging).

## Goal

Add process-level crash handlers on Runtime, CLI serve, and Desktop Main, plus a minimal structured JSON logger for Runtime lifecycle without secrets.

## Changes

### `src/runtime/log.ts` (new)

- `RuntimeLogLevel`: `info` | `warn` | `error`
- `runtimeLog(level, event, fields?)` — one JSON line to stderr; optional file via `setRuntimeLogPath`
- Redacts secret keys case-insensitively: `token`, `oneTimeCode`, `authorization`, `password`, `secret` (and nested objects)
- Intended fields: `pid`, `port`, `commandType`, `durationMs`, `code`, `clientId`, `outcome`, etc.

### `src/runtime/index.ts`

- `registerRuntimeProcessHandlers()` once: `unhandledRejection` + `uncaughtException`
  - structured `error` log (`code: fatal`)
  - if this process owns Runtime: `stopRuntime` with 2s race, then force `removeLock` / `removeDiscovery` if still owned
  - `process.exit(1)`
- Lifecycle logs (no token): `runtime_starting`, `runtime_started`, `runtime_stopping`, `runtime_stopped`
- `startRuntime` sets log path from config and registers handlers

### `src/cli/main.ts`

- `cmdServe` (foreground + `--daemon-child`): early `setRuntimeLogPath` + `registerRuntimeProcessHandlers` before `startRuntime`

### `src/desktop/runtimeChild.ts`

- Same early registration so Desktop-spawned Runtime has crash handlers even if start fails mid-flight

### `src/desktop/main.ts`

- Unified process handlers for all builds (not debug-package only)
- `uncaughtExceptionMonitor` + `unhandledRejection` → `console.error` + append to `userData/logs/main.log`
- Debug package still uses existing console patch → `debug.log`; crash path also writes `main.log`

### Skipped (intentional)

- `src/runtime/httpServer.ts`: no auth/cors request logging this pass (avoid contested merge surface; metrics already exist)

## Out of scope / not touched

- clients `onStreamClose`, update pipeline, migrator, `ensurePreferences`
- No secret fields in log output; discovery token never logged

## Validation

- Not run: tests / `build:all` (per Agents.md unless user requests)
- Manual follow-up: start `cardo serve`, confirm JSON lines on stderr / `runtime.log`; force a rejection in a throwaway probe if needed

## Residual risk

- Fatal path races `stopRuntime` at 2s; stuck HTTP close could leave lock until stale recovery (force cleanup runs if `runtimeState` still set)
- Desktop Main handlers log only (do not exit); Electron may still terminate on uncaughtException depending on version defaults
- High-volume request logging still absent (F6 partial)

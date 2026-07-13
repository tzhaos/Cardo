# Worklog: shared Runtime schema compatibility gate

Branch: `fix/runtime-hardening-cleanup-docs`

Addresses review H7: Extension/CLI lacked Desktop’s schema (and CLI lacked `/app/`) gates; recovery copy hardcoded schemaVersion 9.

## Problem

Clients shared one Runtime protocol and `DATABASE_SCHEMA_VERSION`, but compatibility checks were uneven:

- Desktop used one-sided `schemaVersion >= DATABASE_SCHEMA_VERSION` and separate `/app` probe.
- CLI `open` issued bootstrap without schema or `/app` checks.
- Extension NM discover returned any healthy Runtime without schema equality.
- Desktop start error dialog hardcoded `schemaVersion is 9`.

A newer Runtime can speak a protocol the client cannot; older Runtime lacks client-required schema. Prefer equality reject both ways.

## Changes

### `src/core/runtimeCompatibility.ts` (new)

Shared gate:

- `assertRuntimeCompatible({ schemaVersion, requireAppUi?, servesAppUi? })`
- Equality: `schemaVersion === DATABASE_SCHEMA_VERSION` else `schema_mismatch`
- Optional: `requireAppUi && servesAppUi === false` → `app_ui_missing`

### Desktop — `src/desktop/ensureDesktopRuntime.ts`

- Attach and retire paths use `assertRuntimeCompatible({ schemaVersion, requireAppUi: true, servesAppUi })` after health + GET `/app/` probe.
- Wait-for-healthy discovery requires schema equality (UI still checked after ready).
- Retires Runtime when not ok (older, newer, or no app UI).

### Desktop recovery copy — `src/desktop/main.ts`

- Error dialog interpolates `DATABASE_SCHEMA_VERSION` instead of hardcoded `9`.

### CLI — `src/cli/main.ts` `cmdOpen`

- After healthy discovery (token + baseUrl): GET `/app/` probe + `assertRuntimeCompatible` with `requireAppUi: true`.
- Fail with stderr message + `exitCode = 1` before bootstrap code.

### Extension — `src/extension/runtime/discoverRuntime.ts` + guide

- After NM `runtime.discover` ok: `assertRuntimeCompatible({ schemaVersion, requireAppUi: false })`.
- Fail → `RuntimeDiscoverError(code, message)` (`schema_mismatch` / would-be `app_ui_missing`).
- `extensionApp.tsx` already routes discover errors to `renderRuntimeGuide`.
- `runtimeGuide.ts` classifies `schema_mismatch` / `app_ui_missing` with upgrade/stop steps.

## Not touched

- Update package / clients session / migrator (per task).
- Discovery file schema (still no `servesAppUi` field; Desktop/CLI probe `/app/`).

## Principles

- One schema contract for all clients; equality not “newer is fine”.
- `/app` only where UI is required (Desktop attach, `cardo open`); Extension skips static UI check.

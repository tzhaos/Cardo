# Worklog: Desktop main tray / openExternal / startup dialog (30788051)

Date: 2026-07-13  
Branch: `feature/hover-tip`  
Owned file: `src/desktop/main.ts` only  
Addresses review items from `docs/reviews/30788051-desktop-clients.md` (F3 tray + packaged recovery, F6 openExternal allowlist) and related copy/hardcode audits.

## Goal

1. Locale-aware tray labels (no architecture word "Runtime" in product copy).
2. Restrict `shell:open-external` to safe URL schemes before `shell.openExternal`.
3. Packaged-friendly dual-tone startup `showErrorBox` (product steps first; technical secondary with `DATABASE_SCHEMA_VERSION`).

## Changes

### Tray labels (`updateTrayMenu` / helpers)

- Added `isChineseLocale()`: `app.getLocale().toLowerCase().startsWith('zh')` → zh, else en.
- Added `getTrayLabels(windowVisible)`:

| Action | zh | en |
| --- | --- | --- |
| Toggle | 显示 Cardo / 隐藏 Cardo | Show Cardo / Hide Cardo |
| Quit | 退出 | Quit |
| Quit + stop service | 退出并停止本机服务 | Quit and stop local service |

- Replaced Chinese-only hardcodes and former 「退出并停止 Runtime」 label.
- Comments updated to say "local service" instead of user-facing "Runtime".

### `shell:open-external` allowlist

- Added `isAllowedExternalUrl(url)`: allow only `http:`, `https:`, `mailto:`.
- Handler parses request, rejects other schemes with a thrown Error before `shell.openExternal`.
- Aligns with favicon path already restricting http/https; addresses F6 (protocol breadth).

### Startup `showErrorBox` recovery

- Added `formatStartupFailureDialog(error)` used by `app.whenReady()` catch.
- Locale-aware title:
  - zh: Cardo 无法启动
  - en: Cardo could not start
- Primary body: end-user recovery only (quit other Cardo / reinstall same version / avoid mixed installs). No monorepo npm runbook as default primary steps.
- Technical secondary:
  - data folder `%APPDATA%\cardo`
  - `discovery.json` schemaVersion interpolated via `DATABASE_SCHEMA_VERSION` (not a bare `9`)
  - log paths (`runtime.log`, `logs\main.log`)
  - monorepo `cardo stop` / `npm run desktop:build` only when `!app.isPackaged`
  - full error detail/stack last

## Out of scope / not touched

- `src/web-next/ui/cardo/error-screen.ts` (other agent)
- Updater files (`desktopUpdater.ts` and related)
- Extension / CLI recovery copy

## Validation

- Not run: `test:ts` / `build:all` (per Agents.md default; local gate owned by orchestrator for branch PR)
- Static review of `src/desktop/main.ts` only

## Residual risk

- OS locale may differ from in-app preference locale (pre-UI tray/dialog has no preferences yet).
- `mailto:` is allowed; other schemes (e.g. `file:`, custom) remain blocked.
- Internal log/`console` lines still say "Runtime" (dev-facing, not tray product copy).

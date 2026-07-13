# Worklog — Desktop updater integrity fail-closed (f432f78a)

## Scope

Desktop GitHub Release updater integrity and install-channel isolation.

Files touched:

- `src/desktop/update/githubReleaseClient.ts`
- `src/desktop/update/desktopUpdater.ts`
- `src/desktop/update/installChannel.ts`
- `src/desktop/update/installChannel.test.ts`

## Findings addressed

- H6 / desktop-clients: Portable updater could fall back to Setup (silent channel migration).
- Errors review: packaged updates could surface with `sha256: null` and still download/install.
- Tests quality: `installChannel.test.ts` reimplemented path heuristics instead of importing production pure helpers.

## Changes

### `pickAssetForChannel`

- Portable channel: only Portable assets; return `null` if missing.
- No Portable → Setup fallback.
- Missing-installer message for portable no longer says "or Setup".

### `fetchLatestStableUpdate`

- Fail closed on missing SHA256SUMS asset (`UpdateFetchError` code `missing_checksum`).
- Fail closed when SUMS has no entry for the chosen asset name (same code).
- Never returns `available` with `sha256: null` for a packaged update candidate.

### `downloadInstaller`

- `expectedSha256` is required (`string`).
- Empty/missing checksum throws `missing_checksum` before download starts.
- Always verifies SHA-256 after download.
- Size check remains as secondary integrity check after hash match.

### `DesktopUpdater.installUpdate`

- Portable channel + non-portable `assetKind` → refuse install (no silent migration).
- Require non-empty `available.sha256` before install.
- Before spawn / portable apply: re-read installer file and recompute SHA-256 via `node:crypto` `createHash`; mismatch aborts install.
- Portable path only runs when channel is portable (assetKind already guarded).

### `installChannel` pure helpers

- Exported `isTypicalInstallDirectory` and `classifyByPath` for unit tests.
- `detectInstallChannel` accepts optional runtime hints; default lazily `require`s electron so pure helper imports stay free of Electron under `tsx --test`.
- `installChannel.test.ts` imports production helpers (no dual-track reimplementation).

## Verification notes

- Not run: full `npm run build:all` / package smoke (per task scope; Agents.md test policy).
- Logic review against review items H6 and checksum fail-closed requirements.

## Residual / follow-ups (out of this patch)

- Contract `desktopUpdateAvailableInfoSchema.sha256` remains `.nullable()` for schema compatibility; runtime fetch path no longer returns null for successful available updates.
- Optional: dedicated unit tests for `parseSha256Sums` / pick-asset fail-closed branches.

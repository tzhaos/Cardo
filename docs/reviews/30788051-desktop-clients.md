# Desktop and client surfaces (30788051)

Date: 2026-07-13  
Scope: `src/desktop/**`, CLI, Extension, Native Host, shared client, packaging, updater, `release.yml`, install channels, compatibility gate  
Mode: read-only product-surface review (no code changes outside this file)

## Executive judgment

Cardo’s multi-client model is implemented in line with the architecture: Runtime alone holds SQLite; Desktop / Web / Extension are symmetric RuntimeClient consumers; CLI and Native Host stay on process and discovery edges. Desktop attach-first / embed-if-missing is careful (schema equality + `/app/` UI gates, detached `runtime-child`, Main never in-process holds the DB, default quit does not stop shared Runtime). Preload IPC is non-DB and Zod-validated; missing Runtime injection fails closed.

Since the earlier f432f78a pass, several high-risk packaging and integrity gaps are closed in source:

- Portable never falls back to Setup assets (`pickAssetForChannel`).
- SHA256 is required at fetch, download, and install re-verify (fail-closed).
- Shared `assertRuntimeCompatible` enforces schema equality on Desktop attach, CLI `open`, and Extension NM discover.

What remains before treating mixed-version clients and Extension-on-Desktop as production-complete:

1. Native Messaging host is not in Desktop Setup / Portable / Release assets; Extension discovery still depends on a separate `native-host:install` path while product copy says “install or reinstall Cardo.”
2. No force-update / blocking path for schema or protocol breaks; updates stay optional Settings + delayed startup check.
3. Packaged recovery UX (startup error box, some error-screen steps, tray labels) is still developer- or Chinese-only oriented.
4. Portable apply helper still single-shot `copy` with temp-log-only failure; install-channel edge cases and `shell:open-external` protocol breadth remain soft edges.

Overall: Desktop host + updater integrity are milestone-ready for Setup/Portable GitHub releases on a same-version fleet. Multi-surface product promise (especially Extension without a separate bridge install) and break-glass force-update are not ready for “install Desktop and everything just works.”

## Surface matrix

| Surface | Role | Authority | Main risks |
| --- | --- | --- | --- |
| Cardo Runtime (`src/runtime/*`) | Sole DB + Command/Query/History + revision/SSE fan-out | SQLite + lock/discovery | Stuck incompatible Runtime after shutdown timeout; static UI missing blanks attach/open |
| Desktop Main (`main.ts`, `ensureDesktopRuntime.ts`, `runtimeChild.ts`) | Attach-first shell; spawn detached child if missing | None (baseUrl + process token only) | Embed child / asar.unpacked missing; retire timeout leaves lock; monorepo recovery dialog |
| Desktop Renderer (Runtime `/app/` + preload) | UI client + shell ports + update UI | None | Preload config missing → fail-closed; mid-session Runtime death → banner only |
| CLI (`src/cli/main.ts`) | serve / open / status / stop steward | Can start Runtime; not business writer | `serve` without static still possible (warn); open now schema+/app-gated |
| Web (`web-runtime` + `hostPlatform`) | Browser UI client | None | Token via one-time code / sessionStorage; same-origin under Runtime |
| Extension (`src/extension/**`) | Toolbar shell client | None | NM host not in Desktop package; guide overclaims reinstall fixes NM |
| Native Host (`src/native-host/**`) | discover + open-local-resource only | None (reads discovery) | Separate install; Windows discovery ACL best-effort |
| Updater (`src/desktop/update/**`) | GitHub latest stable Setup/Portable | N/A | No force-update UX; portable replace fragile; channel heuristics |
| Packaging (`package.json` build, write-desktop-app-package, build-pipeline, release.yml) | Setup + Portable + SHA256SUMS | N/A | NM/CLI/extension out of release; electron-builder `publish` still configured |

## Findings

### F1 — Severity: high

- Area: Native Host distribution vs Extension product path
- Evidence: Extension discovery is NM-only (`src/extension/runtime/discoverRuntime.ts`). Install is `npm run native-host:install` → registry under HKCU (`scripts/install-native-host.ts`). Release pipeline ships Setup + Portable only (`scripts/build-pipeline.ts` lines 65–72; `.github/workflows/release.yml` assets). Desktop Main never registers `com.cardo.local_bridge`. Guide copy for `native_host_missing` says install/reinstall Cardo (`runtimeGuide.ts`).
- Risk: “Install Desktop, load Extension” fails with `native_host_missing` even when Runtime is healthy. Multi-client promise is incomplete for store users.
- Recommendation: NSIS post-install and/or first-run Desktop register NM host pointing at a packaged host binary; include host in Setup (and document Portable + Extension). Align guide steps until packaging wires it.

### F2 — Severity: medium

- Area: Force update / schema-breaking client policy
- Evidence: Updater is opt-in Settings + 8s delayed startup check (`desktopUpdater.ts` `scheduleStartupCheck`; Settings update group). No `minClientVersion`, no blocking modal, no “must update before continue.” Compatibility is schema equality at attach/discover time, not continuous.
- Risk: Users can ignore updates; after a schema bump they only fail at next attach/discover with recovery friction. No coordinated force path across Desktop + Extension.
- Recommendation: For breaking releases, add release meta or signed min-client/schema policy; blocking dialog on Desktop when client cannot safely talk to Runtime or when available update is marked critical.

### F3 — Severity: medium

- Area: Packaged vs developer recovery UX
- Evidence: Startup failure `dialog.showErrorBox` interpolates `DATABASE_SCHEMA_VERSION` but still points at monorepo commands (`node artifacts/cli/cardo.js stop`, `npm run desktop:build`) in `src/desktop/main.ts`. Error-screen preferences mismatch still hardcodes “schemaVersion is 9” and monorepo steps (`src/web/ui/cardo/error-screen.ts`). Tray menu labels are Chinese-only (`main.ts` tray template).
- Risk: Packaged users get developer-centric steps; schema hardcode drifts on bump; non-zh users get Chinese tray only (product i18n policy).
- Recommendation: Packaged vs dev copy branches; interpolate `DATABASE_SCHEMA_VERSION` everywhere; bilingual tray; primary recovery: quit Cardo / Settings update / release page / `cardo stop` when CLI exists.

### F4 — Severity: medium

- Area: Incompatible Runtime retirement timeout
- Evidence: `retireIncompatibleRuntime` POSTs `/v1/shutdown` then waits up to 8s (`ensureDesktopRuntime.ts`). On timeout only warns; embed may then hit `runtime_already_running` and fail closed with log path.
- Risk: Stuck old Runtime blocks Desktop until manual stop.
- Recommendation: After timeout, surface pid/diagnostics and explicit “run cardo stop / kill stuck process”; optional SIGTERM fallback matching CLI stop.

### F5 — Severity: medium

- Area: Portable apply helper robustness
- Evidence: Batch waits on original PID, single `copy /Y`, relaunch, self-delete (`desktopUpdater.ts` `applyPortableUpdate`). Failures append `%TEMP%\cardo-portable-update.log` only; process already quitting.
- Risk: File lock / second instance → silent-ish failed replace.
- Recommendation: Retry copy loop; message box or relaunch with failure notice; consider replace-from-temp rename strategy.

### F6 — Severity: low

- Area: `shell:open-external` protocol breadth
- Evidence: Main invokes `shell.openExternal` after `z.url()` only (`main.ts`, `desktopIpc.ts`). Favicon path restricts http/https; open-external does not.
- Risk: Renderer/AppPorts could open non-http schemes if fed untrusted text.
- Recommendation: Allowlist `http:`, `https:` (and optionally `mailto:`) in Main before openExternal.

### F7 — Severity: low

- Area: electron-builder `publish` config vs scripts
- Evidence: `package.json` `build.publish` points at GitHub `tzhaos/Cardo`. Scripts use `--publish never`. Release uses `gh release create` after `release:build`, not electron-builder publish.
- Risk: Accidental `electron-builder` without `--publish never` may attempt publish if token present.
- Recommendation: Set publish null / never by default; keep script flag as belt-and-suspenders.

### F8 — Severity: low

- Area: Install channel detection edge cases
- Evidence: Portable via `PORTABLE_EXECUTABLE_*`; Setup via Program Files / LocalAppData\Programs; else writable → portable, else setup (`installChannel.ts`). Tests cover common heuristics (`installChannel.test.ts`).
- Risk: Zip under Programs misclassified as setup; read-only network share as setup without NSIS expectations.
- Recommendation: Keep channel visible in Settings (already); support env override for support cases.

### F9 — Severity: low

- Area: Discovery / NM token threat model
- Evidence: Token in discovery.json with best-effort 0o600 (`discovery.ts`). NM returns full process token to Extension (`handleNativeHostRequest.ts`). Same-user local trust model.
- Risk: Same-user malware can read discovery or NM; acceptable for local-first single-user, weak for shared machines.
- Recommendation: Document threat model; later short-lived Extension session tokens (Desktop already avoids long-lived token in URL).

### F10 — Severity: info (positive)

- Area: Closed relative to prior desktop-clients review
- Evidence:
  - Schema equality helper shared: `src/core/runtimeCompatibility.ts`; used by Desktop attach, CLI open, Extension discover.
  - Portable no Setup fallback: `githubReleaseClient.ts` `pickAssetForChannel`.
  - SHA256 required at latest fetch (missing SUMS or entry throws), download refuses empty hash, install re-hashes file (`githubReleaseClient.ts`, `desktopUpdater.ts`); Zod requires sha256 on available info (`desktopUpdate.ts`).
  - Preload non-DB + fail-closed sentinel (`preload.ts`, `hostPlatform.ts`).
  - No `database:execute` business SQL IPC; AppPorts non-DB (`createDesktopPorts.ts`).
  - Release workflow requires both Setup and Portable artifacts and writes `SHA256SUMS.txt` (fail if missing).
  - `release:build` runs `check` then `desktop:package` (`build-pipeline.ts`).

## Updater packaging checklist pass/fail

| Check | Result | Notes |
| --- | --- | --- |
| Setup vs Portable channel detection | Pass (edge cases) | Env + install-tree + writable heuristic; F8 |
| GitHub latest only (no draft/prerelease) | Pass | `releases/latest` + draft/prerelease reject |
| Asset names match release artifacts | Pass | Preferred `Cardo-${version}-Setup-x64.exe` / `…-Portable-x64.exe`; package.json nsis/portable artifactName; release.yml copies same |
| SHA256SUMS produced on release | Pass | release.yml writes `SHA256SUMS.txt` |
| SHA256 required on fetch | Pass | missing SUMS or entry → `UpdateFetchError` |
| SHA256 enforced on download | Pass | streaming hash; mismatch deletes partial |
| SHA256 re-verify at install | Pass | `hashFileSha256` before spawn/replace |
| Size as primary integrity | Pass (not used as sole) | secondary after hash |
| Partial download handling | Pass | `.partial` then rename; abort → available |
| Portable in-place replace | Pass (fragile) | helper cmd after quit; F5 |
| Setup runs installer then quits app | Pass | detached spawn + delayed quit |
| Portable→Setup silent fallback | Pass (blocked) | picker + install refuse non-portable asset on portable channel |
| Force update UX | Fail | optional only; F2 |
| Dev / unpackaged updates disabled | Pass | phase `unsupported` when not packaged or channel dev |
| Startup auto-check | Pass | 8s delay, non-blocking |
| Cancel download | Pass | AbortController |
| asarUnpack main + web-runtime | Pass | package.json asarUnpack; runtime-child prefers unpacked |
| web-runtime in desktop app package | Pass | `write-desktop-app-package.ts` copies artifacts/web-runtime |
| Version injection | Pass | Vite `__APP_VERSION__`; electron-builder version from app package.json; release bumps package version |
| Local package never publishes | Pass | `--publish never` on desktop:package* |
| Release only on tag / dispatch | Pass | release.yml; CI on main does not publish |
| GH_TOKEN absent from app updater | Pass | unauthenticated GitHub API + User-Agent |
| Native host in Desktop installer | Fail | F1 |
| CLI/extension in Desktop release | N/A / deferred | explicit out of release:build |
| User-visible update UI | Pass | Settings phases + open release page + channel/asset labels |
| Checksum name parse robust | Pass | POSIX basename of SUMS fields |
| Unsigned builds intentional | Pass (policy) | CSC_IDENTITY_AUTO_DISCOVERY false in pipeline/workflow |

## Multi-client scenarios

| Scenario | Expected | Actual / risk |
| --- | --- | --- |
| Runtime already healthy (CLI or prior embed) | Desktop attaches; loads `/app/`; quit leaves Runtime | Pass if schema equality + `/app/` OK |
| No Runtime | Desktop spawns detached runtime-child (auto), waits health, loads UI | Pass if asar.unpacked child + web-runtime present |
| Stale lock, dead process | Lock acquire cleans lock+discovery and starts | Pass (lock stale path in Runtime) |
| status=starting, live pid within grace | No lock steal | Pass (`LOCK_STARTUP_GRACE_MS`) |
| Old schema Runtime running | Desktop does not attach; tries shutdown then embed | Pass path; timeout → manual stop (F4) |
| Runtime healthy but no `/app/` | Desktop not attach; embed requires static | Pass for Desktop; CLI open gated the same way |
| Schema mismatch on Extension | Fail discover with schema_mismatch guide | Pass equality check; recovery needs version align |
| Port conflict | Runtime listens port 0 on 127.0.0.1 | Pass; bind fail → start error |
| Desktop + Extension same time | Two clients, same revision SSE space | Pass if NM + Runtime up; NM install gap (F1) |
| Desktop + Web (`cardo open`) | Same origin app, shared Runtime | Pass; one-time code not long-lived URL token |
| Desktop quit default | Unregisters client only; Runtime auto-grace if last | Pass (tray + will-quit comments) |
| Tray “退出并停止 Runtime” | Authenticated `/v1/shutdown` | Pass (Chinese-only label; F3) |
| CLI stop | HTTP shutdown then SIGTERM | Pass |
| Extension NM host missing | Guide UI retry | Pass UX; product fix is packaging (F1) |
| Extension Runtime down | runtime_unavailable guide | Pass |
| Portable update | Download portable, helper replace, relaunch | Pass happy path; copy fail weak UX (F5) |
| Setup update | Download Setup, spawn NSIS, quit | Pass |
| Portable offered Setup only on release | Check fails missing_installer / no silent migrate | Pass |
| Wrong install path (zip vs Programs) | Channel heuristic | Mostly pass; F8 |
| Missing web-runtime in package | Embed fails closed | Pass |
| Second Desktop instance | Single instance lock → focus existing | Pass (`requestSingleInstanceLock`) |
| Schema newer or older than client | Equality required (not `>=`) | Pass shared gate |
| Auto Runtime, zero clients | Grace stop after clientGraceMs (15s default) | Pass |
| Embed race: another process wins lock while child fails | Race attach retry | Pass |
| Mid-session Runtime death | Banner / reconnect; no local DB fallback | Pass hostPlatform fail-closed model |
| Shared revision watermarks | hello + command.ok + SSE + apply mutex | Pass RuntimeClient design |

## Priority for next release

1. Ship and register Native Messaging host from Desktop Setup / first run so Extension works without monorepo `native-host:install` (F1).
2. Define force-update / critical-break policy for schema or protocol bumps (blocking Desktop path + Extension messaging) (F2).
3. Packaged recovery copy: dynamic schema everywhere, end-user steps, bilingual tray (F3).
4. Harden incompatible Runtime retirement after shutdown timeout (diagnostics + stop fallback) (F4).
5. Portable apply: retry copy + user-visible failure (F5).
6. Restrict `shell:open-external` protocols (F6).
7. Neutralize electron-builder `publish` accidental path (F7).
8. Smoke matrix before tag: attach, embed cold start, `cardo open` schema gate, Extension discover with/without NM, Setup update dry-run, Portable update dry-run, portable-with-setup-only-release, stale lock, dual client revision, SHA256SUMS missing-name fail-closed.

## Evidence index (primary paths)

- Attach/embed: `src/desktop/ensureDesktopRuntime.ts`, `src/desktop/runtimeChild.ts`, `src/desktop/main.ts`
- Compatibility: `src/core/runtimeCompatibility.ts`, `src/core/database/version.ts`
- Preload/IPC: `src/desktop/preload.ts`, `src/core/contracts/desktopIpc.ts`, `src/desktop/bridge.ts`, `src/desktop/ports/createDesktopPorts.ts`
- Updater: `src/desktop/update/desktopUpdater.ts`, `githubReleaseClient.ts`, `installChannel.ts`, `src/core/contracts/desktopUpdate.ts`
- Packaging: `package.json` `build`, `scripts/write-desktop-app-package.ts`, `scripts/build-pipeline.ts`, `scripts/build-all.ts`, `.github/workflows/release.yml`
- CLI: `src/cli/main.ts`
- Extension: `src/extension/bootstrap/extensionApp.tsx`, `discoverRuntime.ts`, `runtimeGuide.ts`
- Native Host: `src/native-host/handleNativeHostRequest.ts`, `scripts/install-native-host.ts`
- Shared client: `src/client/runtimeClient.ts`, `src/web/platform/hostPlatform.ts`, `src/web-runtime/main.tsx`
- Lock/discovery: `src/runtime/lock.ts`, `src/runtime/discovery.ts`, `src/runtime/paths.ts`, `src/runtime/index.ts`, `src/runtime/clients.ts`

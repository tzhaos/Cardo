# Desktop and client surfaces review (f432f78a)

Date: 2026-07-13  
Scope: Desktop, CLI, Extension, Native Host, packaging/updater, web-runtime host  
Read-only code review of attach-first Runtime, preload IPC, GitHub updater, electron-builder, NM discovery, and multi-client revision space.

## Executive judgment

The multi-client model is implemented consistently: Runtime is the only SQLite authority; Desktop / Web / Extension are symmetric RuntimeClient consumers; CLI and Native Host stay on the process/discovery edge. Desktop attach-first / embed-if-missing is carefully written (schema + `/app/` UI gates, no in-process Runtime in Electron Main, quit does not kill shared Runtime). Preload IPC is intentionally non-DB and Zod-validated.

Updater and packaging are close to production shape: Setup vs Portable channels, GitHub `latest` only, artifact names aligned with release workflow and asset pickers, SHA256 verification when SUMS exist, `publish never` on local/package scripts. The main gaps for v0.1.3+ are incomplete schema gates on CLI/Extension, optional checksums, Portable→Setup fallback UX risk, Native Host not shipped with Desktop Setup, and no force-update path for schema-breaking releases.

Overall: architecture and Desktop host path are solid enough for milestone Desktop release; multi-surface edge cases and update integrity need tightening before relying on mixed-version clients in the wild.

## Surface matrix

| Surface | role | authority | main risks |
| --- | --- | --- | --- |
| Cardo Runtime (`src/runtime/*`) | sole DB + Command/Query/History + revision fan-out | SQLite + process lock/discovery | stale lock races (mitigated); auto grace kills empty embed; wrong static UI path blanks Desktop/Web |
| Desktop Main (`src/desktop/main.ts`, `ensureDesktopRuntime.ts`) | attach-first shell; spawn detached runtime-child if missing | none (token + baseUrl only) | embed child missing asar.unpacked; incompatible Runtime retirement timeout; hard-coded recovery copy |
| Desktop Renderer (Runtime-hosted `/app/` + preload) | UI client + shell ports (clipboard, dialogs, update UI) | none | missing preload injection fail-closed; Runtime dies mid-session → banner only |
| CLI (`src/cli/main.ts`) | serve / open / status / stop steward | none (can start Runtime) | open does not gate schema or `/app/`; stop SIGTERM fallback may leave dirty lock on hard failures |
| Web (Runtime static + `web-runtime/main.tsx`) | browser UI client | none | token via one-time code / sessionStorage; same-origin only when hosted under Runtime |
| Extension (`src/extension/**`) | toolbar shell client | none | NM host missing in Desktop package; no schemaVersion gate after discover |
| Native Host (`src/native-host/**`) | discover + open-local-resource only | none (reads discovery.json) | separate install path; Windows ACL on discovery is best-effort |
| Updater (`src/desktop/update/**`) | GitHub latest stable installers | N/A | optional SHA256; Portable→Setup fallback; no force-update UX |
| Packaging (`package.json` build, `write-desktop-app-package.ts`, release.yml) | Setup + Portable + SHA256SUMS | N/A | `publish` block present but scripts force never; native-host not in release assets |

## Findings

### F1 — Severity: high
- Area: Extension / CLI schema compatibility vs Desktop attach gates
- Evidence: Desktop refuses attach when `discovery.schemaVersion < DATABASE_SCHEMA_VERSION` and retires incompatible Runtimes (`src/desktop/ensureDesktopRuntime.ts` ~103–153, ~331). Extension returns schema from NM but never compares it (`src/extension/runtime/discoverRuntime.ts` ~61–72; bootstrap injects token immediately in `extensionApp.tsx` ~20–28). CLI `cmdOpen` only checks health (`src/cli/main.ts` ~270–305).
- Risk: Old Runtime (or half-migrated discovery) can still feed Extension/Web; clients then hit Zod / protocol mismatches or blank UX without a guided recovery. Desktop is stricter than other surfaces → confusing “Desktop works, Extension fails” or reverse.
- Recommendation: Shared `assertRuntimeCompatible(discovery)` used by Desktop attach, CLI open, and Extension inject: require `schemaVersion === DATABASE_SCHEMA_VERSION` (or documented min), and optionally `/app/` reachability for open/Desktop. Surface RuntimeGuide / CLI stderr with `cardo stop` + rebuild/upgrade steps.

### F2 — Severity: high
- Area: Portable updater fallback to Setup asset
- Evidence: `pickAssetForChannel` for portable prefers portable, then falls back to Setup (`src/desktop/update/githubReleaseClient.ts` ~115–120). Install path: if channel portable but `assetKind === 'setup'`, runs NSIS UI (`desktopUpdater.ts` ~286–298). Settings labels distinguish channels (`SettingsPanel.tsx` ~1008–1011) but still allow install of Setup binary onto a portable-detected install.
- Risk: Portable user downloads/installs NSIS; ends up with Programs install, dual copies, or wrong update path next time. Silent channel migration is easy to miss.
- Recommendation: Do not fall back portable→setup for auto apply. Surface “Setup asset only” with open-release-page / manual download; or require explicit user confirm that install channel will change.

### F3 — Severity: medium
- Area: SHA256 optional integrity
- Evidence: Checksum fetch failures set `sha256 = null` (`githubReleaseClient.ts` ~194–209). Download only enforces checksum when present; otherwise falls back to size match if `expectedSizeBytes` set (`~286–305`). Release workflow always emits `SHA256SUMS.txt` (`.github/workflows/release.yml` ~133–144), but any incomplete release or name mismatch leaves downloads unverified beyond size.
- Risk: Tampered or wrong asset can install if SUMS missing/mismatched name; size alone is weak.
- Recommendation: Treat missing checksum for the chosen asset as hard error in packaged builds (or warn + require explicit “install anyway”). Fail release publish if SUMS cannot map Setup/Portable names.

### F4 — Severity: medium
- Area: Force update / schema-breaking releases
- Evidence: Updater is opt-in Settings UI + delayed startup check (`desktopUpdater.ts` ~81–91; `SettingsPanel.tsx` ~1025–1092). No minimum-supported-client version, no blocking modal, no “must update before continue”.
- Risk: After a schema bump, old packaged Desktop can attach only if Runtime schema >= required (Desktop), but older UI may still talk protocol incompatibly when Runtime is newer (`schemaVersion >=` allows attach to newer Runtime — ensureDesktopRuntime.ts ~112, ~141, ~331). Users can ignore available updates indefinitely.
- Recommendation: For v0.1.3+, add optional `minClientVersion` / `minSchema` in release notes or a small signed meta file; if current client cannot safely talk to running Runtime, force update dialog (download + install) with no dismiss for critical breaks.

### F5 — Severity: medium
- Area: Desktop startup failure UX
- Evidence: `dialog.showErrorBox` recovery text hardcodes `schemaVersion is 9` (`src/desktop/main.ts` ~586–594) while SoT is `DATABASE_SCHEMA_VERSION` in `src/core/database/version.ts`. Messages point at monorepo paths (`npm run desktop:build`, `artifacts/cli/cardo.js stop`) not end-user packaging language.
- Risk: Copy drifts on schema bumps; packaged users get developer-centric recovery.
- Recommendation: Interpolate `DATABASE_SCHEMA_VERSION`. Dual copy: packaged vs dev (product language vs `cardo stop` / log paths). Keep `runtime.log` and `cardo stop` as primary recovery.

### F6 — Severity: medium
- Area: Native Host distribution vs Extension
- Evidence: Extension discovery is NM-only (`discoverRuntime.ts` comments + path). Native host install is `npm run native-host:install` (registry under HKCU, `scripts/install-native-host.ts`). Desktop package/release pipeline ships Setup + Portable only (`build-pipeline.ts` ~65–72; release.yml assets). Desktop Main never registers NM host.
- Risk: “Install Desktop, load Extension” fails with `native_host_missing` even when Runtime is healthy. Product promise of multi-client is incomplete for Extension without separate install.
- Recommendation: NSIS post-install (or first-run Desktop) register `com.cardo.local_bridge` pointing at packaged host binary; document Extension store path separately. Until then, Extension guide steps should mention Desktop reinstall must include bridge registration (today guide says reinstall Cardo — true only after packaging wires it).

### F7 — Severity: medium
- Area: CLI open without static UI / schema gates
- Evidence: `cmdOpen` spawns `serve --daemon-child` on unhealthy discovery, waits health only (`cli/main.ts` ~275–305). `resolveServeStaticDir` is optional for serve (warn only, ~124–126). Desktop embed requires static UI (`runtimeChild.ts` ~30–43).
- Risk: `cardo open` can open browser against API-only Runtime (no `/app/`) or old schema; user sees broken page while Desktop would have refused attach or rebuilt embed.
- Recommendation: Mirror Desktop: require healthy + compatible schema + `/app/` 200 before issuing bootstrap code; if static missing, print clear `npm run web-runtime:build` / reinstall message and exit non-zero.

### F8 — Severity: medium
- Area: Incompatible Runtime retirement timeout
- Evidence: `retireIncompatibleRuntime` posts `/v1/shutdown` then waits up to 8s (`ensureDesktopRuntime.ts` ~132–192). On timeout only warns; then spawn may fail with `runtime_already_running` and eventual attach/embed error (~83–96).
- Risk: Stuck old Runtime leaves Desktop unable to start without manual `cardo stop`.
- Recommendation: After timeout, attempt lock/pid diagnostics and surface explicit “stuck Runtime pid N; run cardo stop” in the error box; optional SIGTERM fallback matching CLI stop.

### F9 — Severity: low
- Area: electron-builder `publish` config vs scripts
- Evidence: `package.json` build.publish points at GitHub tzhaos/Cardo (~150–157). Scripts use `electron-builder --win --publish never` (`desktop:package`, `desktop:package:debug`). Release workflow uses `gh release create` after `release:build`, not electron-builder publish.
- Risk: Accidental `electron-builder` without `--publish never` could attempt GitHub publish (needs token).
- Recommendation: Set `"publish": null` or document that only release.yml publishes; keep `--publish never` as belt-and-suspenders.

### F10 — Severity: low
- Area: Portable apply helper robustness
- Evidence: Batch waits on original PID, `copy /Y`, relaunch, self-delete (`desktopUpdater.ts` ~313–369). Writable check on target dir. Failures append temp log only.
- Risk: If app.quit delayed / second instance holds file, copy fails with little UI feedback (process already quitting). PID reuse within wait loop is unlikely but possible on Windows.
- Recommendation: Retry copy loop; on failure launch notepad/log path or message box before exit; consider `move` from temp + rename strategy.

### F11 — Severity: low
- Area: Preload IPC surface
- Evidence: Channels are window chrome, clipboard, shell open, local resource open, save dialogs, website icon, update (`main.ts` ~352–478; `preload.ts` ~39–116). No `database:*` / SQL IPC. Runtime config is sync inject only. Zod on bridge boundaries (`desktopIpc.ts`).
- Risk: `shell:open-external` uses `z.url()` without protocol allowlist — renderer could pass non-http schemes if AppPorts ever fed untrusted text.
- Recommendation: Restrict openExternal to `http:`/`https:` (and maybe `mailto:`) in Main.

### F12 — Severity: low
- Area: Discovery security
- Evidence: Token lives in discovery.json with best-effort 0o600 (`discovery.ts` ~41–59). NM returns full token to Extension (`handleNativeHostRequest.ts` ~59–71). Design assumes local-user trust.
- Risk: Same-user malware can read discovery or NM; acceptable for local-first app, not multi-user shared machines.
- Recommendation: Document threat model; later consider short-lived Extension session tokens exchanged from process token inside Runtime (Desktop already avoids putting process token in URL).

### F13 — Severity: low
- Area: Multi-client same revision space
- Evidence: Desktop loads `${baseUrl}/app/` same-origin (`main.ts` ~536–540); Web uses same static entry (`web-runtime/main.tsx`); Extension injects same RuntimeClient with `client: 'extension'`. `RuntimeClient` hello + SSE mutation/ready, shared revision watermarks (`runtimeClient.ts`). AppPorts non-DB only on all surfaces.
- Risk: Residual race conditions in apply mutex are handled carefully; main residual risk is reconnect full catch-up cost, not divergent authorities.
- Recommendation: Keep as-is; add integration smoke: Desktop + Extension mutate → both see same revision/scopes.

### F14 — Severity: low
- Area: Install channel detection for non-standard paths
- Evidence: Portable via `PORTABLE_EXECUTABLE_*`; Setup via Program Files / LocalAppData\Programs; else writable dir → portable, else setup (`installChannel.ts` ~32–81). Tests cover Programs vs Downloads heuristics (`installChannel.test.ts`).
- Risk: Zip extracted under Programs misclassified as setup; read-only network share classified setup without NSIS expectations.
- Recommendation: Expose installChannel in diagnostics UI (already in Settings); allow override env for support cases.

## Updater & packaging deep dive

Correctness checklist (pass/fail):

| Check | Result | Notes |
| --- | --- | --- |
| Setup vs Portable channel detection | Pass (with edge cases) | Env + install-tree + writable heuristic; see F14 |
| GitHub latest only (no draft/prerelease) | Pass | `releases/latest` + explicit draft/prerelease reject (`githubReleaseClient.ts` ~163–168) |
| Asset name match release artifacts | Pass | Preferred `Cardo-${version}-Setup-x64.exe` / `…-Portable-x64.exe`; nsis/portable artifactName in package.json ~142–148; release.yml copies same names |
| SHA256SUMS produced on release | Pass | release.yml writes `SHA256SUMS.txt` |
| SHA256 enforced on download | Partial fail | Enforced only when hash resolved; else size (F3) |
| Partial download handling | Pass | `.partial` then rename; abort returns to available |
| Portable in-place replace | Pass (fragile) | Helper cmd after quit (F10) |
| Setup runs installer UI then quits app | Pass | spawn detached + app.quit delay |
| Portable→Setup silent fallback | Fail product-wise | Code intentional; UX risk (F2) |
| Force update UX | Fail | Optional only (F4) |
| Dev / unpackaged updates disabled | Pass | phase `unsupported` when not packaged or channel dev |
| Startup auto-check | Pass | 8s delay, non-blocking |
| Cancel download | Pass | AbortController |
| asarUnpack main + web-runtime | Pass | package.json ~108–109; resolveRuntimeChildPath prefers unpacked (`ensureDesktopRuntime.ts` ~197–222); runtimeChild static candidates (~94–99) |
| web-runtime copied into desktop app package | Pass | `write-desktop-app-package.ts` copies artifacts/web-runtime |
| Version injection | Pass | Vite `__APP_VERSION__` from package.json; electron-builder version from app package.json written from root |
| Local package never publishes | Pass | `--publish never` on desktop:package* |
| Release only on tag / dispatch | Pass | release.yml; regular CI not in this file but Agents.md policy matches |
| GH_TOKEN in app updater | Pass (absent) | Unauthenticated GitHub API + User-Agent; GH_TOKEN only in Actions |
| Artifact names match updater pickers | Pass | Preferred names + regex fallbacks |
| Native host in Desktop installer | Fail | Not packaged (F6) |
| CLI/extension in Desktop release | N/A / deferred | Explicitly out of release:build scope |
| User-visible update UI | Pass | Settings group phases + open release page |
| Checksum name parse robust | Pass | POSIX basename of SUMS fields |

## Multi-client scenarios

| Scenario | Expected | Actual / risk |
| --- | --- | --- |
| Runtime already healthy (CLI serve/open or prior Desktop embed) | Desktop attaches; loads `/app/`; quit leaves Runtime | Pass if schema + `/app/` OK; Desktop gates schema/UI |
| No Runtime | Desktop spawns detached runtime-child (auto), waits health, loads UI | Pass if asar.unpacked child + web-runtime present; clear errors if missing |
| Stale lock, dead process | Lock acquire cleans lock+discovery and starts | Pass (`tryAcquireExclusiveLock` stale path) |
| status=starting, live pid within grace | No lock steal | Pass (`LOCK_STARTUP_GRACE_MS`) |
| Old schema Runtime running | Desktop does not attach; tries shutdown then embed | Pass path; timeout → manual stop (F8) |
| Runtime healthy but no `/app/` | Desktop not attach; embed requires static | Pass for Desktop; CLI open may still bootstrap (F7) |
| Port conflict | Runtime listens port 0 on 127.0.0.1 | Pass; conflict only if bind fails → start error |
| Desktop + Extension same time | Two clients, same revision SSE space | Pass if NM + Runtime up; NM install gap (F6) |
| Desktop + Web (`cardo open`) | Same origin app, shared Runtime | Pass; token via one-time code not long-lived URL token |
| Desktop quit default | Unregisters client only; Runtime auto-grace if last | Pass (tray + will-quit comments) |
| Tray “退出并停止 Runtime” | Authenticated `/v1/shutdown` | Pass |
| CLI stop | HTTP shutdown then SIGTERM | Pass; lock cleanup depends on Runtime stop path |
| Extension NM host missing | Guide UI retry | Pass copy; fix requires install path (F6) |
| Extension Runtime down | runtime_unavailable guide | Pass |
| Portable update | Download portable exe, helper replace, relaunch | Pass happy path; copy fail weak UX (F10) |
| Setup update | Download Setup, spawn NSIS, quit | Pass |
| Wrong install path (zip vs Programs) | Channel heuristic | Mostly pass; F14 |
| Missing web-runtime in package | Embed fails closed | Pass (runtime-child exits; ensureDesktopRuntime error) |
| Second Desktop instance | Single instance lock → focus existing | Pass (`requestSingleInstanceLock`) |
| Schema newer on Runtime than client | Desktop attaches if schema >= required | Risk of protocol skew (F4); prefer equality check |
| Auto Runtime, zero clients | Grace stop after clientGraceMs (15s default) | Pass (`startGraceIfEmpty`) |
| Embed race: another process wins lock while child fails | Race attach retry | Pass (`ensureDesktopRuntime` ~83–88) |

## Priority fixes for next release (v0.1.3+)

1. Shared Runtime compatibility gate (schema + optional `/app/`) for Desktop, CLI open, Extension inject — fail with the same recovery story (F1, F7).
2. Stop Portable→Setup auto-apply; require explicit channel change or release-page only (F2).
3. Require SHA256 match for packaged update downloads when publishing Desktop (F3); fail release if SUMS incomplete.
4. Ship and register Native Messaging host from Desktop Setup / first run so Extension works out of the box (F6).
5. Replace hard-coded schema `9` and monorepo-only recovery text in Desktop error box with dynamic schema + packaged vs dev copy (F5, F8).
6. Define force-update policy for schema/protocol breaks (blocking Settings modal or pre-window dialog) (F4).
7. Harden portable apply helper retries and user-visible failure if copy fails (F10).
8. Restrict `shell:open-external` protocols (F11).
9. Optionally neutralize electron-builder `publish` config to avoid accidental publish (F9).
10. Smoke matrix before tag: attach, embed cold start, `cardo open`, Extension discover, Setup update dry-run, Portable update dry-run, stale lock, dual client revision.

## Evidence index (primary paths)

- Attach/embed: `src/desktop/ensureDesktopRuntime.ts`, `src/desktop/runtimeChild.ts`, `src/desktop/main.ts`
- Preload/IPC: `src/desktop/preload.ts`, `src/core/contracts/desktopIpc.ts`, `src/desktop/bridge.ts`
- Updater: `src/desktop/update/desktopUpdater.ts`, `githubReleaseClient.ts`, `installChannel.ts`
- Packaging: `package.json` `build`, `scripts/write-desktop-app-package.ts`, `scripts/build-pipeline.ts`, `scripts/build-all.ts`, `.github/workflows/release.yml`
- CLI: `src/cli/main.ts`
- Extension: `src/extension/bootstrap/extensionApp.tsx`, `discoverRuntime.ts`, `runtimeGuide.ts`
- Native Host: `src/native-host/handleNativeHostRequest.ts`, `scripts/install-native-host.ts`
- Shared client: `src/client/runtimeClient.ts`, `src/web-next/platform/hostPlatform.ts`, `src/web-runtime/main.tsx`
- Lock/discovery: `src/runtime/lock.ts`, `src/runtime/discovery.ts`, `src/runtime/paths.ts`, `src/runtime/index.ts`

# Hardcode audit — Desktop packaging / updater / install channels / IPC

Date: 2026-07-13  
Scope (read-only): `src/desktop/**`, `package.json` `build`, `scripts/write-desktop-app-package.ts`, `scripts/build-pipeline.ts`, `.github/workflows/release.yml`, related `src/core/version/releaseChannel.ts` and update contracts.  
Product code not modified.

## Summary

| Area | Verdict | Notes |
| --- | --- | --- |
| Artifact name patterns | Multi-site hardcode, mostly aligned | Same `Cardo-${version}-Setup/Portable-x64.exe` string family in builder, release.yml, pipeline, picker |
| `Programs\Cardo` / schema 9 in dialogs | Partial | No prod `Programs\Cardo` path string; dialog uses `DATABASE_SCHEMA_VERSION` (value 9) |
| GitHub repo hardcode vs config | Dual SoT | Defaults in `releaseChannel.ts` + `package.json` publish + UA URL; env override only for fetch path |
| Delay 8000ms / quit delays | Hardcoded | Startup check 8s; setup quit 400ms; portable quit 300ms; unrelated Runtime shutdown wait 8s |
| Channel heuristics | Hardcoded roots | ProgramFiles / LocalAppData\Programs / writable fallback; no product-subdir constant |
| Publish / token | Safe for app | App has no GH_TOKEN; scripts force `--publish never`; release.yml uses Actions `github.token` |
| User-visible English-only errors | Gap | Updater `errorMessage` and startup `showErrorBox` English-only; Settings chrome is i18n |

Overall: packaging and updater names are intentionally duplicated rather than single-sourced. No secret tokens in Desktop client. Main product risks are name/arch drift across four sites, English-only updater/shell errors, and GitHub owner/repo defaults not shared with electron-builder `publish`.

---

## 1. Hardcoded artifact name patterns

### Canonical patterns (intended)

| Kind | Pattern | Source of truth today |
| --- | --- | --- |
| NSIS Setup | `Cardo-${version}-Setup-${arch}.${ext}` | `package.json` → `build.nsis.artifactName` |
| Portable | `Cardo-${version}-Portable-${arch}.${ext}` | `package.json` → `build.portable.artifactName` |
| Generic win | `Cardo-${version}-${os}-${arch}.${ext}` | `package.json` → `build.win.artifactName` |
| Checksums | `SHA256SUMS.txt` | release.yml + picker |

Release and updater further pin arch to **x64** in literal filenames (not `${arch}`).

### Sites that embed the same family

1. `package.json` (electron-builder)

```143:149:package.json
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "artifactName": "Cardo-${version}-Setup-${arch}.${ext}"
    },
    "portable": {
      "artifactName": "Cardo-${version}-Portable-${arch}.${ext}"
```

2. `scripts/build-pipeline.ts` — expected outputs after package:

```60:63:scripts/build-pipeline.ts
const desktopArtifacts = [
  `artifacts/desktop-dist/Cardo-${rootPackage.version}-Setup-x64.exe`,
  `artifacts/desktop-dist/Cardo-${rootPackage.version}-Portable-x64.exe`,
];
```

3. `.github/workflows/release.yml` — copy + notes:

- `artifacts/desktop-dist/Cardo-$version-Setup-x64.exe`
- `artifacts/desktop-dist/Cardo-$version-Portable-x64.exe`
- optional `.blockmap` for Setup
- emits `SHA256SUMS.txt`
- release notes list the same two names

4. `src/desktop/update/githubReleaseClient.ts` — preferred asset names + legacy fallbacks:

| Channel | Preferred literals | Regex fallback |
| --- | --- | --- |
| Setup | `Cardo-${version}-Setup-x64.exe`, `Cardo Setup ${version}.exe` | `setup.*\.exe` excluding portable |
| Portable | `Cardo-${version}-Portable-x64.exe`, `Cardo ${version}.exe`, `Cardo-${version}-win-x64.exe` | `portable.*\.exe` |
| Checksum | exact `SHA256SUMS.txt` | name matches `/sha256/i` and `\.txt$` |

### Drift risk

- Product prefix `Cardo` is literal in four places; `CARDO_DESKTOP_PRODUCT_NAME` only affects electron-builder `productName` via `write-desktop-app-package.ts`, not artifact names or picker strings.
- Arch is hardcoded as `x64` in pipeline, release.yml, and picker preferred names; builder still uses `${arch}` token (currently only x64 targets).
- Legacy alternate names (`Cardo Setup ${version}.exe`, `Cardo ${version}.exe`, `…-win-x64.exe`) are not produced by current builder config; they are dead preferred paths unless old releases still exist.
- No shared TS/JSON module exports `setupArtifactName(version, arch)` for pipeline + release + client.

Severity: medium (rename/rebrand/arch multi-target will require coordinated edits).

---

## 2. `Programs\Cardo` and schema 9 in dialogs

### `Programs\Cardo`

| Location | What is hardcoded | Production impact |
| --- | --- | --- |
| `installChannelHeuristics.ts` | Parent roots: `ProgramFiles`, `ProgramFiles(x86)`, `LOCALAPPDATA\Programs` | Any subdir under those roots counts as “typical install” → setup channel |
| `installChannel.test.ts` | Fixture path `C:\Users\me\AppData\Local\Programs\Cardo` | Test-only; product does not require product folder name `Cardo` |
| Comments in `installChannel.ts` | Mentions LocalAppData\Programs | Doc only |

There is no production constant like `Programs\\Cardo` or NSIS install dir override in scanned Desktop code. Default NSIS install directory is electron-builder default under productName (likely `…\Programs\Cardo` for productName Cardo), but that is builder behavior, not an app string.

### Schema 9 in dialogs

| Location | Behavior |
| --- | --- |
| `src/core/database/version.ts` | `DATABASE_SCHEMA_VERSION = 9` (single numeric SoT) |
| `src/desktop/main.ts` startup `dialog.showErrorBox` | Interpolates ``schemaVersion is ${DATABASE_SCHEMA_VERSION}`` — not a bare `9` literal in the dialog string |
| Older review note (f432f78a-desktop-clients F5) | Claimed hardcode “schemaVersion is 9”; current tree already interpolates the constant |

Residual: recovery text still assumes developer layout (`npm run desktop:build`, `node artifacts/cli/cardo.js stop`, `%APPDATA%\cardo\…`) for packaged users; that is copy hardcoding, not a wrong schema number.

Severity: low for schema literal drift; medium for developer-centric recovery copy.

---

## 3. GitHub repo hardcode vs config

### Configured / overridable (update fetch path)

`src/core/version/releaseChannel.ts`:

- Defaults: `DEFAULT_UPDATE_GITHUB_OWNER = 'tzhaos'`, `DEFAULT_UPDATE_GITHUB_REPO = 'Cardo'`
- Override: `CARDO_UPDATE_OWNER`, `CARDO_UPDATE_REPO`
- URL builders: `api.github.com/repos/{owner}/{repo}/releases[/latest]`, `github.com/{owner}/{repo}/releases/tag/{tag}`

`fetchLatestStableUpdate` uses `resolveUpdateRepository(env)` — correct SoT for API calls.

### Hardcoded outside that SoT

| Site | Value | Override? |
| --- | --- | --- |
| `githubReleaseClient.ts` `userAgent()` | `Cardo-Desktop/${version} (+https://github.com/tzhaos/Cardo)` | No — ignores env / resolveUpdateRepository |
| `package.json` `homepage` / `repository` / `bugs` | `tzhaos/Cardo` | npm metadata only |
| `package.json` `build.publish` | `provider: github`, `owner: tzhaos`, `repo: Cardo` | electron-builder only; not used by custom updater |
| Release notes / tags | Product naming only | N/A |

### Implication

Forks can point the updater at another repo via env, but User-Agent still advertises tzhaos/Cardo. electron-builder publish block is a third copy of owner/repo unused by the in-app client.

Severity: low–medium (fork/support confusion; accidental publish config, see §6).

---

## 4. Delay 8000ms and quit delays

| Constant | Value | File | Role |
| --- | --- | --- | --- |
| `scheduleStartupCheck(delayMs = 8_000)` | 8000 ms default | `desktopUpdater.ts` | Delayed non-blocking first update check after ready |
| Setup install quit | 400 ms | `desktopUpdater.ts` | After spawning NSIS, `app.quit()` |
| Portable apply quit | 300 ms | `desktopUpdater.ts` | After spawning helper cmd, `app.quit()` |
| `WAIT_SHUTDOWN_TIMEOUT_MS` | 8000 ms | `ensureDesktopRuntime.ts` | Wait for incompatible Runtime `/v1/shutdown` (not updater) |
| `WAIT_HEALTH_TIMEOUT_MS` | 20000 ms | `ensureDesktopRuntime.ts` | Embed health wait |
| `STATIC_PROBE_TIMEOUT_MS` | 2000 ms | `ensureDesktopRuntime.ts` | `/app` probe |
| GitHub JSON / SUMS fetch | 20000 ms | `githubReleaseClient.ts` | `AbortSignal.timeout` |
| Installer download | 30 minutes | `githubReleaseClient.ts` | Default when no AbortController signal |
| Favicon fetch | 6000 ms | `main.ts` | Unrelated shell port |

Call site: `main.ts` invokes `desktopUpdater.scheduleStartupCheck()` with no argument → always 8s.

Severity: low (magic numbers; quit delays may be short if antivirus holds the exe).

---

## 5. Channel heuristics hardcodes

### Detection algorithm (`installChannel.ts` + heuristics)

1. `!app.isPackaged` → `dev`
2. `PORTABLE_EXECUTABLE_DIR` or `PORTABLE_EXECUTABLE_FILE` → `portable` (electron-builder portable env)
3. `isTypicalInstallDirectory(execDir)` → `setup`
4. Else if directory writable → `portable` (zip / side-by-side)
5. Else → `setup`

### Hardcoded roots (`installChannelHeuristics.ts`)

```text
env.ProgramFiles
env['ProgramFiles(x86)']
path.join(env.LOCALAPPDATA, 'Programs')
```

No hardcode of product folder name under Programs. Matching is prefix-of-resolved-path (case-normalized).

### Other channel hardcodes

| Item | Value |
| --- | --- |
| Contract channel field | `channel: 'github-stable'` only (`desktopUpdateStateSchema`) |
| Install channels | `'setup' \| 'portable' \| 'dev'` |
| Asset kinds | `'setup' \| 'portable'` |
| Draft/prerelease | Explicit reject after `releases/latest` |
| Portable→Setup fallback | Refused at pick and install (fail closed; no silent migration) |

### Edge cases (heuristic hardcode risk)

- Zip under `LocalAppData\Programs\…` → classified **setup** even if user treats it as portable.
- Read-only network share → **setup** without NSIS layout.
- Writable odd paths → **portable** without `PORTABLE_EXECUTABLE_*`.

Severity: low–medium (support edge cases; Settings already surfaces installChannel).

---

## 6. Publish / token hardcodes

### Desktop client (good)

- Custom GitHub REST client: unauthenticated `fetch`, User-Agent only.
- No `GH_TOKEN` / `GITHUB_TOKEN` in `src/desktop/**` or updater modules.
- Download URLs come from release asset `browser_download_url` (public).

### Local package scripts (good belt)

```text
electron-builder --win --publish never
```

Both `desktop:package` and `desktop:package:debug`.

### Residual publish config

```151:158:package.json
    "publish": [
      {
        "provider": "github",
        "owner": "tzhaos",
        "repo": "Cardo",
        "releaseType": "release"
      }
    ]
```

Risk: invoking electron-builder without `--publish never` could attempt GitHub publish (would still need a token in env). Actual milestone publish is `gh release create` in release.yml with `GH_TOKEN: ${{ github.token }}` (CI only).

### Other packaging env hardcodes

| Item | Where | Notes |
| --- | --- | --- |
| `CSC_IDENTITY_AUTO_DISCOVERY: 'false'` | release.yml + build-pipeline default | Unsigned OSS builds |
| `ELECTRON_MIRROR` GitHub CDN on CI | release.yml | Avoid China mirror on Actions |
| Local default proxy `http://127.0.0.1:7890` | build-pipeline | When `CARDO_BUILD_PROXY` unset and not CI |
| Local Electron mirror npmmirror | build-pipeline | When not CI |
| Workflow artifact name | `Cardo-v${version}-Desktop` | retention 30 days |

Severity: low for tokens; low–medium for accidental electron-builder publish config.

---

## 7. User-visible error English only

### i18n surface (OK)

`SettingsPanel` Desktop update chrome uses `t('settings.update*')` for labels, phase chrome, install channel labels. When `phase === 'error'`, UI does:

```text
${t('settings.updateError')}: ${state.errorMessage}
```

So the prefix is localized; **`errorMessage` body is not**.

### English-only strings that reach users

From `desktopUpdater.ts` / `githubReleaseClient.ts` (surfaced as `errorMessage` or install result):

- Updates are only available in packaged Desktop builds.
- No update is available to download. Check for updates first.
- Update has no SHA-256; refusing download without integrity metadata.
- Download cancelled.
- Installer is not ready / missing / SHA-256 re-verification failed.
- Refusing to install a non-portable update on a portable install…
- Portable directory is not writable…
- No published GitHub release found.
- GitHub API ${status}: …
- Current app version is not X.Y.Z.
- Latest release tag "…" is not a product semver.
- Release v… has no Desktop Setup/Portable asset.
- Release v… has no SHA256SUMS asset / no entry for "…".
- Installer download failed / checksum_mismatch / size_mismatch.

From `main.ts` `dialog.showErrorBox` (native OS dialog, no i18n):

- Title: `Cardo failed to start`
- Body: English “Typical fixes” + monorepo commands + schemaVersion line + stack detail

From `ensureDesktopRuntime.ts` / `runtimeChild.ts` (thrown into that dialog path):

- English Runtime child missing / no /app UI / could not attach within N ms / cardo stop hints

### Contrast: tray is Chinese-hardcoded

Tray menu in `main.ts`: `显示 Cardo` / `隐藏 Cardo` / `退出` / `退出并停止 Runtime` — not English, also not locale-aware (fixed zh). Tooltip `Cardo`.

Severity: medium for product i18n consistency (en updater errors + zh tray + bilingual settings chrome).

---

## 8. IPC surface (related hardcodes)

Channels (string literals, not user-facing):

| Channel | Direction |
| --- | --- |
| `runtime:get-config` | sync Main → preload |
| `dialog:save-json` / `dialog:save-text` | invoke |
| `update:get-state` / `check` / `download` / `cancel-download` / `install` / `open-release-page` | invoke |
| `update:state` | Main push event |

Boundaries: Zod parse via `desktopUpdateStateSchema` / install result / desktop IPC schemas. No `database:*` SQL IPC. No hardcoded GitHub URLs in preload.

Unrelated shell hardcodes in Main: `User-Agent: 'Cardo/1.0'` for favicon; window `title: 'Cardo'`.

---

## 9. `write-desktop-app-package.ts`

Hardcodes:

- Product name default `'Cardo'` (`CARDO_DESKTOP_PRODUCT_NAME` override for debug package)
- Paths: `artifacts/desktop`, `artifacts/web-runtime`, dest `web-runtime` under desktop app
- Embedded package.json: `main: 'main/main.js'`, `type: 'module'`
- Version/name/description copied from root package.json (good SoT for version)

Does not write artifactName or publish config (those stay on root package.json for electron-builder).

---

## 10. Alignment matrix (should stay in sync)

When changing product name, arch, or checksum file name, update all of:

| # | File / symbol |
| --- | --- |
| 1 | `package.json` `build.nsis` / `portable` / `win.artifactName` |
| 2 | `scripts/build-pipeline.ts` `desktopArtifacts` |
| 3 | `.github/workflows/release.yml` Prepare release assets + notes |
| 4 | `githubReleaseClient.ts` `pickSetupAsset` / `pickPortableAsset` / `pickChecksumAsset` |
| 5 | Optional: `releaseChannel.ts` defaults if repo renames |
| 6 | Optional: `userAgent()` URL and package.json metadata |

Currently there is no automated check that (1)–(4) agree.

---

## 11. Findings ranked

| ID | Severity | Finding |
| --- | --- | --- |
| H1 | Medium | Artifact basename family duplicated in builder / pipeline / release.yml / picker with x64 pinned outside builder templates |
| H2 | Medium | Updater and startup shell errors are English-only while Settings UI is i18n and tray is fixed Chinese |
| H3 | Low–Med | GitHub owner/repo defaults in three places; UA ignores `CARDO_UPDATE_*` |
| H4 | Low–Med | Channel heuristics hardcode Windows install roots; no product-dir constant (good) but edge misclassification possible |
| H5 | Low | Magic delays 8000 / 400 / 300 not named shared constants |
| H6 | Low | `build.publish` hardcodes tzhaos/Cardo while scripts force never; accidental publish if flags dropped |
| H7 | Low | Startup error dialog developer paths and schema version display (version now from SoT constant = 9) |
| H8 | Info | Test-only `Programs\Cardo`; production uses `…\Programs` prefix only |
| H9 | Info | No GH_TOKEN in Desktop app; release CI token only |

---

## 12. Recommended follow-ups (not done in this audit)

1. Single module e.g. `src/core/version/desktopArtifacts.ts` exporting setup/portable/checksum name builders; generate or assert pipeline + release.yml + picker against it (or a unit test reading package.json artifactName patterns).
2. Route updater errors through stable error codes + i18n keys; keep English as fallback message.
3. Point `userAgent()` at `resolveUpdateRepository()` (or omit repo URL).
4. Set electron-builder `publish: null` or document-only; keep `--publish never`.
5. Name quit/startup delays as exported constants with short comments.
6. Packaged vs dev branches for `showErrorBox` recovery text.
7. Tray labels via same locale preference as renderer (or fixed bilingual later).

---

## 13. Files scanned

- `src/desktop/main.ts`
- `src/desktop/preload.ts`, `bridge.ts`
- `src/desktop/ensureDesktopRuntime.ts`, `runtimeChild.ts`
- `src/desktop/ports/createDesktopPorts.ts`
- `src/desktop/update/desktopUpdater.ts`
- `src/desktop/update/githubReleaseClient.ts`
- `src/desktop/update/installChannel.ts`
- `src/desktop/update/installChannelHeuristics.ts`
- `src/desktop/update/installChannel.test.ts`
- `src/core/version/releaseChannel.ts`
- `src/core/contracts/desktopUpdate.ts`, `desktopIpc.ts`
- `src/core/database/version.ts`
- `scripts/write-desktop-app-package.ts`
- `scripts/build-pipeline.ts`
- `package.json` (`scripts` + `build`)
- `.github/workflows/release.yml`
- Related UI: `src/web-next/components/settings/SettingsPanel.tsx` (DesktopUpdatePanel only)

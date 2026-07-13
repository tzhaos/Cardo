# Hardcode audit — config / paths / versions / Runtime constants

Date: 2026-07-13  
Scope (read-only): `src/runtime`, `src/core`, `src/cli`, `src/client`, `src/native-host`, `scripts` (not `node_modules`).  
Also notes cross-surface hits in `src/desktop`, `src/web`, `assets`, `package.json` when they duplicate the same concept.  
Product code not modified.

Classification legend:

| Tag | Meaning |
| --- | --- |
| ok-constant | Named constant / Zod default / SoT; hardcode is intentional or already centralized |
| should-centralize | Same concept repeated; one SoT would reduce drift |
| bug-risk | Drift can break runtime, updates, discovery, or user recovery |
| doc-only | Docs/README/review text only; not product runtime path |

---

## Summary

| Area | Verdict | Notes |
| --- | --- | --- |
| Schema version | Mostly good; one UI hardcode | SoT `DATABASE_SCHEMA_VERSION = 9`; error-screen still literals `9` |
| Ports | Dynamic by design | Runtime binds `0` / optional port; stop script guesses fixed ports |
| Timeouts / grace | Scattered named + raw ms | Grace 15s SoT in config; many peer timeouts are file-local |
| Paths | Path SoT solid; NM log diverges | `cardo` / APPDATA Roaming vs native-host LOCALAPPDATA |
| GitHub owner/repo | Dual SoT | `releaseChannel.ts` + package publish + UA string |
| productName | Intentional split | Display `Cardo` vs path `cardo` vs appId `com.cardo.desktop` |
| Product version | package 0.1.0 vs review “v0.1.2 era” | Extension manifest not rewritten at build |
| HTTP status / body limits | Local constants OK | Status codes inline; body 2 MiB; icon 256 KiB triplicated |
| Auth token / TTL | Module-local OK | Bytes + TTL private; `min(32)` duplicated across Zod |
| Duplicate concept strings | Several families | Headers, format literals, GH repo, schema 9 copy |

---

## 1. Schema version numbers vs DATABASE_SCHEMA_VERSION

### SoT

| Constant | Value | File |
| --- | --- | --- |
| `DATABASE_SCHEMA_VERSION` | `9` | `src/core/database/version.ts` |
| `BASELINE_SCHEMA_VERSION` | `3` | same |

Forward migrator steps are keyed 4…9 in `src/core/database/migrator.ts` (step map includes `9: layoutSnippetMigrationSql`). That is structural, not a free-floating magic for wire checks.

### Call sites that import SoT (ok-constant)

- `src/runtime/httpServer.ts` — health / hello / diagnostics emit `DATABASE_SCHEMA_VERSION`
- `src/runtime/index.ts` — discovery write
- `src/core/runtimeCompatibility.ts` — client/runtime gate
- `src/core/application/workspaceCommandHandlers.ts`, `initializeWorkspaceDatabase.ts`
- `src/desktop/main.ts` — recovery dialog interpolates `${DATABASE_SCHEMA_VERSION}` (fixed relative to earlier review that claimed a bare `9`)

### Remaining literal 9 in product UI (bug-risk)

| Location | Text |
| --- | --- |
| `src/web/ui/cardo/error-screen.ts` ~80, ~87 | ZH/EN recovery steps: `schemaVersion 为 9` / `schemaVersion is 9` |

When schema bumps to 10, Desktop start dialog stays correct; Preferences mismatch recovery copy will lie.

Docs that restate `= 9` (`docs/architecture/*`, review worklogs): doc-only — refresh when bumping schema.

---

## 2. Port numbers, timeouts, grace ms

### Ports

| Value | Where | Class | Notes |
| --- | --- | --- | --- |
| Host `127.0.0.1` | `src/runtime/config.ts` Zod literal + default; `index.ts` listen; `httpServer.ts` URL/CORS | ok-constant | Design bind-localhost only |
| Port `0` / omit | `config.ts` optional; `index.ts` `listen(..., 0)` | ok-constant | OS-assigned dynamic port |
| Preferred fixed product port | (none in Runtime) | ok-constant | No product default like 5261 |
| `[5261, 5260, 5262, 4173]` | `scripts/stop-cardo-instances.ts` `freeRuntimePorts` | should-centralize | Heuristic for dev stop only; 4173 is Vite-ish; can miss real dynamic ports (pid/cmdline path is primary) |

### Grace / idle (Runtime lifetime)

| Value | Name / site | Class |
| --- | --- | --- |
| `15_000` | `clientGraceMs` default in `runtime/config.ts` (Zod `.default` + `?? 15_000`) | ok-constant (duplicated twice in same file — minor should-centralize to one exported `DEFAULT_CLIENT_GRACE_MS`) |
| `60_000` | `DEFAULT_CLIENT_IDLE_MS` in `runtime/clients.ts` | ok-constant |
| `10_000` | `IDLE_SWEEP_INTERVAL_MS` in `runtime/clients.ts` | ok-constant |
| `30_000` | `LOCK_STARTUP_GRACE_MS` exported from `runtime/lock.ts` | ok-constant |
| `2_000` | young ready-lock re-probe window in `lock.ts` | should-centralize | Magic adjacent to startup grace |

### Timeouts inventory (ms)

| ms | Site | Role | Class |
| --- | --- | --- | --- |
| 800 | `runtime/lock.ts` `HEALTH_PROBE_TIMEOUT_MS` | health probe abort | ok-constant |
| 200 | `lock.ts` `HEALTH_PROBE_GAP_MS`; CLI poll loops | poll gap | ok-constant / local |
| 3 attempts | `lock.ts` `HEALTH_PROBE_ATTEMPTS` | health retries | ok-constant |
| 5000 | `runtime/database.ts` `PRAGMA busy_timeout = 5000` | SQLite busy | should-centralize (export pragma constant) |
| 60_000 | `runtime/auth.ts` `BOOTSTRAP_TTL_MS` | one-time code TTL | ok-constant |
| 2_000 | `runtime/index.ts` fatal stop race | stop deadline | should-centralize |
| 15_000 | `cli/main.ts` `waitForRuntime(..., 15_000)` | open/serve attach wait | should-centralize (matches grace default by coincidence only) |
| 300 | `cli/main.ts` post-shutdown settle | sleep | ok-constant local |
| 2_000 | `cli/main.ts` `probeRuntimeAppUi` | GET /app/ abort | should-centralize with Desktop static probe |
| 20_000 | `desktop/ensureDesktopRuntime.ts` `WAIT_HEALTH_TIMEOUT_MS` | attach/start wait | ok-constant (file-local) |
| 200 | same `WAIT_HEALTH_POLL_MS` | poll | ok-constant |
| 2_000 | same `STATIC_PROBE_TIMEOUT_MS` | /app/ probe | should-centralize with CLI |
| 8_000 | same `WAIT_SHUTDOWN_TIMEOUT_MS` | wait Runtime gone | ok-constant |
| 10_000 | `client/runtimeClient.ts` `waitForFirstReady(10_000)` | first SSE ready | should-centralize |
| 250 → max 8_000 | `runtimeClient.ts` reconnect backoff | stream reconnect | ok-constant local |
| 20_000 | `desktop/update/githubReleaseClient.ts` API/SHA GET | network | ok-constant |
| 30 * 60_000 | same download default | installer download | ok-constant |
| 8_000 | `desktopUpdater.scheduleStartupCheck` default | delayed update check | ok-constant (see desktop audit) |
| 6000 | `desktop/main.ts` favicon fetch | icon | should-centralize with icon size limits |

CLI open health wait (15s) vs Desktop attach (20s) vs client ready (10s): three different budgets for “Runtime becomes usable” — should-centralize if ops tuning is expected.

---

## 3. Paths: cardo, APPDATA, hard-coded Windows paths

### Path SoT (ok-constant)

`src/runtime/paths.ts`:

| Export | Value |
| --- | --- |
| `CARDO_USER_DATA_DIR_NAME` | `cardo` |
| `CARDO_DB_FILENAME` | `cardo.sqlite` |
| `CARDO_LOCK_FILENAME` | `runtime.lock` |
| `CARDO_DISCOVERY_FILENAME` | `discovery.json` |
| `CARDO_LOG_FILENAME` | `runtime.log` |
| `CARDO_THEMES_DIRNAME` | `themes` |

Defaults:

- win32: `%APPDATA%/cardo` (fallback `~/AppData/Roaming/cardo`)
- darwin: `~/Library/Application Support/cardo`
- linux: `${XDG_CONFIG_HOME:-~/.config}/cardo`
- override: `CARDO_DATA_DIR`

Desktop aligns via `app.setName(CARDO_USER_DATA_DIR_NAME)` in `src/desktop/main.ts` (comment explicitly rejects productName casing).

### Path divergences (bug-risk / should-centralize)

| Site | Path behavior | Issue |
| --- | --- | --- |
| `src/native-host/diagnostics.ts` | win: `%LOCALAPPDATA%/cardo/native-host.log`; non-win: `~/.cardo/native-host.log` | Not under Path SoT (`APPDATA` Roaming / Application Support). Diagnostics won’t sit next to `runtime.log` |
| User-facing copy | `%APPDATA%\\cardo\\…` strings in Desktop dialog + error-screen | Correct for Windows Roaming SoT; hardcoded env var name (doc-friendly, not code SoT) |
| `scripts/install-native-host.ts` | `Google\\Chrome\\User Data`, `Microsoft\\Edge\\…`, `HKCU\\Software\\…\\NativeMessagingHosts\\…` | Expected installer hardcodes for Windows browsers — ok-constant for win-only installer |
| `scripts/stop-cardo-instances.ts` | Regexes for `artifacts/cli/cardo.js`, `Cardo` electron paths | Dev tooling only |

### Artifacts / monorepo paths in recovery copy (should-centralize / UX)

- `node artifacts/cli/cardo.js stop`, `npm run desktop:build`, `artifacts/native-host/cardo-native-host.exe` appear in CLI/Desktop/error-screen — developer packaging language, not end-user install path. Same theme as desktop audit.

---

## 4. GitHub owner/repo URLs for updates

### SoT candidate

`src/core/version/releaseChannel.ts`:

- `DEFAULT_UPDATE_GITHUB_OWNER = 'tzhaos'`
- `DEFAULT_UPDATE_GITHUB_REPO = 'Cardo'`
- env override: `CARDO_UPDATE_OWNER` / `CARDO_UPDATE_REPO`
- URL builders: `githubLatestReleaseApiUrl`, `githubReleasePageUrl`, etc.

### Duplicates (should-centralize)

| Site | Value | Used for |
| --- | --- | --- |
| `package.json` homepage/repository/bugs | `https://github.com/tzhaos/Cardo` | npm metadata |
| `package.json` `build.publish` | `owner: tzhaos`, `repo: Cardo` | electron-builder (local scripts force `--publish never`) |
| `githubReleaseClient.ts` `userAgent` | `Cardo-Desktop/${ver} (+https://github.com/tzhaos/Cardo)` | GH API UA — hardcodes owner/repo URL, ignores `resolveUpdateRepository` |

Fetch path uses `releaseChannel` + env (ok). Forks that only set env still send UA pointing at upstream (minor should-centralize / privacy). Builder publish block is a second SoT for the same pair.

---

## 5. Electron productName mismatches

| Concept | Value | Where | Class |
| --- | --- | --- | --- |
| package name | `cardo` | root `package.json` | ok-constant |
| productName (display) | `Cardo` | root `package.json` + `build.productName` | ok-constant |
| Debug productName | `Cardo Debug` | `desktop:package:debug` via `CARDO_DESKTOP_PRODUCT_NAME` | ok-constant |
| Desktop app package productName | env or `Cardo` | `scripts/write-desktop-app-package.ts` | ok-constant |
| Path / Electron userData segment | `cardo` | `CARDO_USER_DATA_DIR_NAME`; `app.setName('cardo')` | ok-constant — intentional ≠ productName |
| appId / AppUserModelId | `com.cardo.desktop` | `package.json` build + `app.setAppUserModelId` in main | should-centralize (string duplicated) |
| Native host name | `com.cardo.local_bridge` | `CARDO_NATIVE_HOST_NAME` | ok-constant |
| Tray tooltip | `'Cardo'` | `desktop/main.ts` | ok-constant |
| Artifact prefix | `Cardo-…` | builder + pipeline + updater (desktop audit) | should-centralize across packaging |

No productName casing bug on data paths: Main deliberately uses `cardo`. Debug rename does not rewrite artifact name patterns or Path SoT.

---

## 6. Version 0.1.0 / 0.1.2 drift (report only)

| Source | Version | Class |
| --- | --- | --- |
| Root `package.json` / lock | `0.1.0` | SoT for product version |
| README / README_zh badge + tag examples | `0.1.0` / `v0.1.0` | doc-only (aligned with package) |
| `assets/extension-shell/manifest.json` | `"version": "0.1.0"` | should-centralize / bug-risk on bump |
| Vite `__APP_VERSION__` | injected from package.json | ok-constant |
| Extension build | copies manifest as-is; does not rewrite `version` from package.json | bug-risk when package bumps without manifest edit |
| Desktop packaged app package.json | written from root version | ok-constant |
| Review docs `f432f78a-*` | “release v0.1.2 era”, backlog “v0.1.3+” | doc-only — historical review context; not package SoT |

Observation: workspace package claims 0.1.0 while prior full-stack review framed HEAD as “v0.1.2 era.” Treat package.json as SoT; resolve tag/history outside this audit. Extension store version can silently lag Desktop if only root version is bumped.

Default clientVersion fallback `'0.0.0'` in `RuntimeClient` when omitted: ok-constant local.

---

## 7. Magic HTTP status and body size limits

### HTTP statuses (`src/runtime/httpServer.ts` + domain errors)

| Status | Typical use | Class |
| --- | --- | --- |
| 200 | ok JSON / static | ok-constant (protocol) |
| 204 | CORS preflight | ok-constant |
| 302 | `/` → `/app/` | ok-constant |
| 400 | invalid_payload / JsonBodyError | ok-constant |
| 401 | unauthorized / bad bootstrap | ok-constant |
| 403 | CORS reject / path traversal | ok-constant |
| 404 | no route / domain not_found | ok-constant |
| 405 | method_not_allowed on queries | ok-constant |
| 409 | domain conflict via `DomainCommandError` | ok-constant |

`DomainCommandError` maps codes → status (`not_found` 404, `conflict` 409, else 400) in `src/core/application/domainError.ts` — ok-constant.

No shared `HttpStatus` enum; inline numbers are fine for a single server module.

### Body / payload limits

| Limit | Value | Site | Class |
| --- | --- | --- | --- |
| Runtime JSON body | `2 * 1024 * 1024` (`MAX_JSON_BODY_BYTES`) | `httpServer.ts` | ok-constant |
| Theme pack JSON | `256_000` (`MAX_THEME_PACK_JSON_BYTES`) | `themePack.ts` + consumers | ok-constant |
| CSS snippet chars | `24_000` (`MAX_CSS_SNIPPET_CHARS`) | `cssSnippet.ts` | ok-constant |
| Website icon bytes | `256 * 1024` | extension port (named); desktop main (raw); web-runtime main (raw) | should-centralize |
| Favicon timeout | 6000 ms | desktop main only | local |
| Native message frame | 4-byte LE length, no max body | `native-host/messageCodec.ts` | should-centralize (Chrome NM ~1 MiB practical cap not enforced) |
| Token min length | `32` (chars) | many Zod + auth check | should-centralize (see §8) |

---

## 8. Auth token lengths and TTL

### `src/runtime/auth.ts` (ok-constant, module-private)

| Constant | Value | Meaning |
| --- | --- | --- |
| `PROCESS_TOKEN_BYTES` | 32 | `randomBytes` → base64url process token |
| `ONE_TIME_CODE_BYTES` | 24 | bootstrap one-time code |
| `BOOTSTRAP_TTL_MS` | 60_000 | code TTL; comment “≤ 60s” |

Constructor regenerates token if provided string `length < 32` (character length, not bytes — base64url of 32 bytes is longer than 32 chars, so OK for generated tokens).

### Zod / wire `min(32)` on token (should-centralize)

Same “token at least 32 characters” appears as:

- `runtime/config.ts`, `runtime/discovery.ts`
- `core/contracts/runtimeProtocol.ts`, `desktopIpc.ts`
- `core/protocols/nativeMessaging.ts`
- client-side checks in `web/platform/hostPlatform.ts` (`length >= 32`)

No single `MIN_PROCESS_TOKEN_CHARS` export. Drift risk if entropy policy changes.

---

## 9. Duplicate strings for the same concept

| Concept | Occurrences | Class | Suggestion |
| --- | --- | --- | --- |
| Schema version `9` in user copy | error-screen ZH/EN; docs; SoT constant | bug-risk | Interpolate `DATABASE_SCHEMA_VERSION` in error-screen (Desktop dialog already does) |
| GitHub `tzhaos` / `Cardo` | releaseChannel, package.json publish/homepage, UA | should-centralize | UA + publish read defaults from one module |
| `com.cardo.desktop` | package.json appId; `setAppUserModelId` | should-centralize | shared constant |
| `X-Cardo-Client-Id` | client header, server read, CORS allow, error message | should-centralize | `RUNTIME_CLIENT_ID_HEADER` constant |
| Format `cardo-workspace` | Zod literal in `workspaceTransfer.ts`; emit in `httpServer.ts` | should-centralize | export `WORKSPACE_TRANSFER_FORMAT` next to `WORKSPACE_TRANSFER_VERSION` |
| Format `cardo-operation-log` | only `hostPlatform.ts` emit (no shared Zod literal found) | should-centralize | add contract constant like theme/workspace |
| Theme format / filenames | `THEME_PACK_DOCUMENT_FORMAT`, `THEME_FILE_EXTENSION`, etc. | ok-constant | Already centralized |
| Icon size `256 * 1024` | desktop, web-runtime, extension | should-centralize | `MAX_WEBSITE_ICON_BYTES` in core |
| clientGrace / attach waits `15_000` / `20_000` / `2_000` | config, CLI, Desktop, lock | should-centralize | shared timing module optional |
| Artifact `Cardo-${version}-Setup/Portable-x64.exe` | package, pipeline, release, picker | should-centralize | see `hardcode-audit-desktop.md` |
| Recovery monorepo CLI path | Desktop dialog, error-screen, guides | should-centralize | end-user wording vs `cardo stop` |
| `Cardo` log prefix | `core/log.ts`, updater console, etc. | ok-constant | brand string |

---

## 10. Scripts-only hardcodes (scan boundary)

| Script | Hardcodes | Class |
| --- | --- | --- |
| `stop-cardo-instances.ts` | ports 5261/5260/5262/4173; process name regexes | should-centralize / tooling-only |
| `write-desktop-app-package.ts` | productName default `Cardo`; paths under `artifacts/` | ok-constant |
| `build-pipeline.ts` | artifact names with root version + x64 | should-centralize |
| `install-native-host.ts` | browser registry keys, User Data dirs, `cardo-native-host.exe` | ok-constant (Windows installer) |
| `package-native-host.ts` | `cardo-native-host.exe` | ok-constant |
| `validate-builtin-themes.ts` | themes/builtin layout | ok-constant |

---

## Priority backlog (no code changes in this audit)

1. bug-risk: Replace error-screen schemaVersion `9` with `DATABASE_SCHEMA_VERSION` (or i18n param).
2. bug-risk: Extension manifest `version` should be rewritten from package.json at build (or single SoT check in CI).
3. bug-risk: Native-host diagnostics path should use `resolveCardoDataPaths()` (or document intentional LOCALAPPDATA split).
4. should-centralize: GitHub owner/repo UA + electron-builder publish vs `releaseChannel.ts`.
5. should-centralize: `MAX_WEBSITE_ICON_BYTES`, token `min(32)`, `X-Cardo-Client-Id`, workspace/operation-log format strings.
6. should-centralize: Align or document CLI 15s vs Desktop 20s health waits and 2s `/app/` probes.
7. doc-only: Refresh architecture docs that hardcode `DATABASE_SCHEMA_VERSION = 9` when schema bumps; clarify package 0.1.0 vs historical “v0.1.2 era” reviews.

---

## Related worklogs

- `docs/reviews/worklogs/hardcode-audit-desktop.md` — packaging / updater / artifact names
- `docs/reviews/worklogs/f432f78a-compat.md` — prior schemaVersion-9 dialog note (Desktop dialog now interpolates constant)
- SoT: `src/core/database/version.ts`, `src/runtime/paths.ts`, `src/core/version/releaseChannel.ts`, `src/runtime/config.ts`, `src/runtime/auth.ts`

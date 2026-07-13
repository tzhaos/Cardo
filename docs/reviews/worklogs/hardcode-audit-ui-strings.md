# Hardcode audit — user-facing UI strings

Date: 2026-07-13  
Scope: READ-ONLY. Product code not modified.  
Surfaces: `src/web`, `src/extension` (bootstrap/UI), `src/desktop` (dialogs/tray), renderer-adjacent strings, seed data that lands in UI.

Related audits (do not duplicate their full scope):

- `docs/reviews/worklogs/copy-audit-zh.md` / `copy-audit-en.md` — tone and product-language quality
- `docs/reviews/worklogs/hardcode-audit-desktop.md` — packaging/updater artifacts
- `docs/reviews/worklogs/hardcode-audit-i18n.md` — en/zh parity and dead keys

## Method

| Check | Approach |
| --- | --- |
| i18n path | Primary catalog `src/web/i18n/messages.ts` + `useI18n` / `t()` |
| Hardcoded UI text | JSX literals, tray/menu labels, dialogs, error screens, bootstrap guides |
| Wrong product names | Grep `Khaos`, `WebNext`, `khaos` under `src/` |
| Schema version in dialogs | Grep `schemaVersion` / literal `9` near user copy |
| Tray locale | `src/desktop/main.ts` tray menu |
| Error screen / hostPlatform / runtimeGuide | Full file review |

## Executive summary

In-app chrome (top bar, boxes, items, settings rows, search, runtime banner, history toolbar) is largely routed through `messages.ts` and is bilingual.

Remaining hardcode debt concentrates outside the React tree:

1. Desktop tray is Chinese-only (and says Runtime).
2. Desktop pre-UI `showErrorBox` is English-only developer runbook.
3. Fatal `error-screen.ts` is dual-locale but not via `messages.ts`, embeds literal schema `9`, and ships local-dev npm instructions to end users.
4. Update pipeline `errorMessage` strings are English-only and surface in Settings About.
5. hostPlatform / RuntimeClient / runtimeCompatibility English errors surface as error-screen or guide technical detail.
6. Seed workspace page titles are English-only in SQLite (user-visible page tabs).

No user-facing `Khaos` or `WebNext` product branding found. Internal type names (`WebNextApp`, `translateWebNext`, `settings.webNextEdition` key) stay in code; displayed value of the edition key is `Cardo`.

---

## Catalog inventory (fragmentation)

| Catalog | Path | Locale source | Notes |
| --- | --- | --- | --- |
| Primary UI | `src/web/i18n/messages.ts` | preferences `locale` | en/zh parity present |
| Fatal bootstrap screen | `src/web/ui/cardo/error-screen.ts` | `navigator.language` | dual locale, not preferences, not messages.ts |
| Extension connect guide | `src/extension/bootstrap/runtimeGuide.ts` | `navigator.language` | intentional dual locale; product-facing quality is good |
| Extension store / action | `vite/extension-locales.ts` → `_locales` | Chrome locale | separate catalog |
| Welcome tips | `src/core/database/welcomeSeed.ts` | seed locale at init | dual locale, written into DB |
| Theme pack name/desc | `themes/builtin/*/theme.cardo-theme.json` | pack `name.en`/`zh` | intentional; not messages.ts |
| Theme looks | `src/web/features/settings/themeLookPresets.ts` | `name.en`/`zh` | intentional dual map |
| Desktop tray / crash dialog | `src/desktop/main.ts` | none | Chinese-only tray; English-only crash dialog |
| Update errors | `src/desktop/update/desktopUpdater.ts`, `githubReleaseClient.ts` | none | English `errorMessage` |

Intentional dual-locale maps (runtimeGuide, welcomeSeed, theme packs, look presets) are acceptable patterns when they stay bilingual and product-toned. They are not automatically defects.

---

## Findings table

Severity: high = shipping broken/mono-locale UI or wrong product/schema hardcodes; medium = user-visible English-only technical detail or jargon hardcodes; low = polish, key naming, dead catalogs, acceptable brand literals with notes.

| Severity | file:line | current | should be (i18n key or formal) |
| --- | --- | --- | --- |
| high | `src/desktop/main.ts:304` | tray `隐藏 Cardo` / `显示 Cardo` | `desktop.tray.hide` / `desktop.tray.show` (en+zh); respect OS or last UI locale |
| high | `src/desktop/main.ts:310` | tray `退出` | `desktop.tray.quit` |
| high | `src/desktop/main.ts:317` | tray `退出并停止 Runtime` | `desktop.tray.quitAndStop` — avoid bare `Runtime` in product copy (e.g. 「退出并停止本机服务」 / “Quit and stop background service”) |
| high | `src/desktop/main.ts:606-614` | `dialog.showErrorBox('Cardo failed to start', …Typical fixes… npm run desktop:build…)` English-only | `desktop.startFailed.title` + user-safe steps; locale via OS; inject `DATABASE_SCHEMA_VERSION` (already used at :612) not literal `9` in prose elsewhere |
| high | `src/web/ui/cardo/error-screen.ts:80` | zh step: `…确认 discovery 中 schemaVersion 为 9。` | Do not hardcode `9`; use `DATABASE_SCHEMA_VERSION` or drop version number from user copy (`error.preferencesMismatch.stepN`) |
| high | `src/web/ui/cardo/error-screen.ts:87` | en step: `…ensure discovery schemaVersion is 9.` | same as above |
| high | `src/web/ui/cardo/error-screen.ts:56-214` | full dual-locale model inline (titles, steps, hints, actions) | either keep intentional dual map (document as SoT) or fold into `messages.ts` under `error.*`; rewrite steps for end users (no `npm run desktop:build`, no `ui-system`, no `preferences 列`) |
| high | `src/web/ui/cardo/error-screen.ts:89-96` | hints mention `ui-system` checkout mixing | remove internal branch/workspace names from user UI |
| medium | `src/desktop/update/desktopUpdater.ts:109` | `Updates are only available in packaged Desktop builds.` | map phase `unsupported` already has `settings.updateUnsupported`; do not also dump raw English `errorMessage`, or add `update.error.unsupported` |
| medium | `src/desktop/update/desktopUpdater.ts:186` | `No update is available to download…` | `update.error.noDownload` (en+zh) |
| medium | `src/desktop/update/desktopUpdater.ts:211` | `Update has no SHA-256; refusing download…` | `update.error.missingChecksum` |
| medium | `src/desktop/update/desktopUpdater.ts:247` | `Download cancelled.` | `update.error.downloadCancelled` |
| medium | `src/desktop/update/desktopUpdater.ts:288-305` | install readiness / channel / checksum English strings | `update.error.*` keys; Settings shows `${t('settings.updateError')}: ${state.errorMessage}` (`SettingsPanel.tsx:986-988`) |
| medium | `src/desktop/update/githubReleaseClient.ts:68` | `No published GitHub release found.` | same family of `update.error.*` (surfaces as `errorMessage`) |
| medium | `src/desktop/update/githubReleaseClient.ts:158-218` | version/tag/asset/checksum English errors | `update.error.*` |
| medium | `src/web/platform/hostPlatform.ts:108-110` | `Desktop Runtime config missing. Main must inject window.__CARDO_RUNTIME__…` | developer detail only in collapsible detail; user summary via `error.runtimeUnavailable` (error-screen already classifies Runtime) |
| medium | `src/web/platform/hostPlatform.ts:133-136` | `Runtime mode requested but no token…` / `Cardo Runtime is not connected…` | user summary keys; keep technical message in detail |
| medium | `src/web/platform/hostPlatform.ts:204` | `RuntimeClient is not connected.` | same |
| medium | `src/web/platform/hostPlatform.ts:397` | `Runtime could not open the local resource.` | `item.openLocalFailed` if ever shown; currently mostly swallowed by callers |
| medium | `src/core/runtimeCompatibility.ts:19` | `Runtime schemaVersion N is not compatible with client schema M…` | guide uses friendly `codes.schema_mismatch`; raw message still appears under runtimeGuide Details / error-screen detail — keep English technical detail OK if never primary summary |
| medium | `src/core/runtimeCompatibility.ts:26` | `Runtime is healthy but does not serve /app UI…` | same pattern |
| medium | `src/extension/runtime/discoverRuntime.ts:49-58` | fallbacks `Native messaging host is not installed.` / `Cardo Runtime is not available.` | already classified into guide; formalize as guide-only fallbacks, not primary title |
| medium | `src/core/database/initializeWorkspaceDatabase.ts:59-87` | seed page titles always `Collection`, `Workspaces`, `Personal`, `Inspiration`, `Recycle Bin` | seed by locale (`welcomeSeed` style) for user pages; system pages can stay DB-English if UI always overlays `t('page.collection')` / `t('page.recycleBin')` (tabs already do) |
| medium | `src/web/i18n/messages.ts:216` / zh `:544` | `Check GitHub milestone releases for Desktop` / `从 GitHub 里程碑 Release 检查 Desktop 更新` | product wording via catalog rewrite (not hardcode outside i18n, but catalog quality gap) — e.g. `settings.updateDescription` without Release jargon |
| medium | `src/web/i18n/messages.ts:242` / zh `:570` | `Design tokens + Theme Pack` / `Design Token + Theme Pack` | `settings.tokenThemePack` → user terms (“主题与设计变量” / “Theme and design tokens”) or hide row |
| medium | `src/web/i18n/messages.ts:213` | key `settings.webNextEdition` value `Cardo` | rename key to `settings.productName` / `settings.edition` (value OK) |
| low | `src/desktop/DesktopTitleBar.tsx:51` | literal `Cardo` brand in title bar | acceptable product name hardcode; optional `product.name` key for consistency |
| low | `src/web/features/settings/SettingsPanel.tsx:911-917` | `alt="Cardo"` / name span `Cardo` | acceptable brand hardcode (also `t('settings.webNextEdition')` nearby) |
| low | `src/desktop/main.ts:345` / `:529` | tray tooltip / window `title: 'Cardo'` | acceptable product name |
| low | `assets/web-runtime/index.html:7` / extension app.html title | `<title>Cardo</title>` | acceptable static document title |
| low | `src/web/ui/cardo/error-screen.ts:264` | brand mark text `Cardo` | acceptable |
| low | `src/web/i18n/messages.ts` history op keys (`history.deleteItem` …) | defined en/zh, never `t()`-referenced in components | dead keys (see hardcode-audit-i18n); remove or wire history UI |
| low | `src/web/i18n/messages.ts:78` | `layout.exitZen` still in catalog | dead (Zen retired); remove |
| low | `src/desktop/main.ts:453` | save dialog filter `name: 'JSON'` | acceptable file-type label; optional i18n if OS dialog language matters |
| low | `src/web-runtime/main.tsx:27` | `Use hostPlatform.openLocalResource…` on port stub | not user path if Runtime capability is used; keep out of UI |

---

## Category deep dives

### 1. Hardcoded English/Chinese UI text not via i18n

Covered well:

- Top bar, collection/recycle tabs, boxes, items, menus, settings chrome, global search, runtime connection banner, desktop window controls, update button labels — all use `t(...)`.

Outside i18n:

| Surface | Status |
| --- | --- |
| Desktop tray menu | Chinese-only hardcode |
| Desktop startup `showErrorBox` | English-only hardcode |
| `error-screen.ts` | Dual locale hardcode (not messages.ts) |
| `runtimeGuide.ts` | Dual locale hardcode (intentional, OK if documented) |
| Welcome seed tips | Dual locale, DB-written (intentional) |
| Theme pack / look names | Dual locale in JSON/TS maps (intentional) |
| Updater `errorMessage` | English-only, surfaces in Settings |
| Seed page titles | English-only in DB |

### 2. Wrong product names (Khaos / WebNext shown to users)

| Probe | Result |
| --- | --- |
| `Khaos` / `khaos` in `src/` user strings | none for UI |
| `WebNext` as displayed product name | none; only internal modules/types (`WebNextApp`, `WebNextLocale`, `translateWebNext`) |
| `settings.webNextEdition` | key name is legacy; **displayed value is `Cardo`** |
| About / title bar / tray tooltip | `Cardo` (correct) |

Verdict: no wrong product branding in user-facing strings. Rename the edition key when convenient.

### 3. Hardcoded schema version numbers in user dialogs

| Location | Form | Issue |
| --- | --- | --- |
| `error-screen.ts:80,87` | literal `9` in user steps | **yes** — drifts when `DATABASE_SCHEMA_VERSION` changes |
| `src/desktop/main.ts:612` | ``schemaVersion is ${DATABASE_SCHEMA_VERSION}`` | correct constant usage (still developer-facing dialog) |
| `src/core/database/version.ts` | `DATABASE_SCHEMA_VERSION = 9` | SoT; not UI |

Action: never put a numeric schema version into user-facing prose as a bare literal; either interpolate the constant or omit the number.

### 4. Tray labels Chinese-only when UI is bilingual

Confirmed at `src/desktop/main.ts:295-328`.

- UI language follows preferences (`en`/`zh`).
- Tray always Chinese regardless of UI or OS language.
- Label `退出并停止 Runtime` mixes product Chinese with architecture term Runtime.

Recommended formal keys:

| Key | en | zh |
| --- | --- | --- |
| `desktop.tray.show` | Show Cardo | 显示 Cardo |
| `desktop.tray.hide` | Hide Cardo | 隐藏 Cardo |
| `desktop.tray.quit` | Quit | 退出 |
| `desktop.tray.quitAndStop` | Quit and stop background service | 退出并停止本机服务 |

Locale resolution for main process: app locale / stored preference / `app.getLocale()`, not hardcoded zh.

### 5. Error-screen hardcoded copy quality

File: `src/web/ui/cardo/error-screen.ts`.

Strengths:

- Dual en/zh, structured title / summary / steps / detail / actions.
- Classifies preferences mismatch, missing `/app` UI, Runtime connect, workspace init, unknown.
- Self-contained CSS (works when app CSS failed).

Quality issues (user-facing):

| Issue | Evidence |
| --- | --- |
| Local-dev runbook | steps call `npm run desktop:build`, `npm run desktop:start`, `cardo serve` |
| Internal workspace names | `ui-system` in hints |
| Schema version hardcode | literal `9` |
| Architecture jargon in summary | “Cardo Runtime as the data authority”, “preferences 列” |
| Not tied to preferences locale | uses `navigator.language` only |
| Not in messages.ts | second SoT for fatal copy |

Suggested formal direction:

- End-user steps: open Cardo / reinstall / check connection; put npm paths only under Technical details or developer builds.
- Keys family: `error.preferencesMismatch.*`, `error.runtimeUnavailable.*`, `error.workspaceInit.*`, `error.unknown.*`.
- Interpolate schema version from `DATABASE_SCHEMA_VERSION` if mentioned at all.

### 6. hostPlatform error strings that surface to users

| String | Path | How it surfaces |
| --- | --- | --- |
| Desktop Runtime config missing… | `hostPlatform.ts:108-110` | bootstrap → `renderCardoErrorScreen` summary/detail (Runtime regex classifies) |
| no token / not connected | `:133-136` | same |
| RuntimeClient is not connected | `:204` | late failure → error boundary / banner path |
| Runtime could not open the local resource | `:397` | return value; callers usually ignore message |

Also related:

- `RuntimeClientError` messages (`runtimeClient.ts`) — English technical.
- `assertRuntimeCompatible` messages — Extension guide detail + Desktop attach logs.
- `ensureDesktopRuntime.ts` throw messages — feed Desktop `showErrorBox` when startup fails.

Policy suggestion: throw stable `code` + short English technical `message` for logs/detail; never rely on raw message as primary UI string when preferences/i18n exist.

### 7. runtimeGuide hardcoded (OK if intentional dual locale)

File: `src/extension/bootstrap/runtimeGuide.ts`.

Verdict: intentional dual-locale map; product-facing quality is high (short, Cardo-named, little architecture jargon). Schema mismatch steps mention `cardo stop` which is acceptable for power users.

Document as a deliberate second catalog; optional future: share message keys with error-screen for schema/connect classes only.

---

## Acceptable hardcodes (do not “fix” into i18n)

| Kind | Examples | Why acceptable |
| --- | --- | --- |
| Product brand | `Cardo` in title bar, About, HTML title, tray tooltip, error brand mark | Product name, not locale copy |
| CSS / DOM contracts | `cardo-box`, `data-cardo-theme`, `data-cardo-runtime-guide`, class names | Style/DOM, not language |
| Feature / theme ids | `chrome.topBar`, `classic`, `fluent` | Stable ids; labels come from i18n/pack |
| Color preset ids | `ocean`, `cardo-blue` in `colorPresets.ts` | Internal ids; chips are visual |
| File export names | `cardo-….json`, `.cardo-theme.json` | Filenames |
| Protocol / API | `__CARDO_RUNTIME__`, SSE field names, command types | Non-UI contracts |
| Console / logs | `[Cardo] Desktop attach…` | Developer logs |
| Architecture comments | `// design §6.6` | Code comments |
| Internal type names | `WebNextApp`, `StartWebNextAppOptions` | Not rendered |
| Theme pack bilingual JSON | `name.en` / `name.zh` | Documented pack format |
| Extension `_locales` | `vite/extension-locales.ts` | Chrome store requirement |
| Save dialog “JSON” filter | `main.ts` | OS file dialog type label |

---

## Positive coverage (already good)

| Area | Evidence |
| --- | --- |
| Main shell UI | Components under `src/web/features/**` use `useI18n` |
| System tabs | Collection/Recycle Bin use `t('page.collection')` / `t('page.recycleBin')`, not DB title |
| Runtime banner | `t('runtime.reconnecting'|'runtime.disconnected')` |
| Desktop window controls | `t('desktop.minimize'|'maximize'|'restore'|'close')` |
| Feature catalog labels | `labelKey` / `descriptionKey` → messages |
| Theme pack display names | pack `name[locale]` |
| Extension store strings | bilingual via build locales |
| Extension guide | bilingual COPY map |
| en/zh key parity | no missing-key gap in messages.ts (see hardcode-audit-i18n) |

---

## Priority fix order (recommendation only)

1. Desktop tray bilingual + de-jargon “Runtime” label.
2. error-screen: remove literal schema `9`; soften/dev-gate npm runbook; prefer constant interpolation.
3. Desktop `showErrorBox`: bilingual or at least user-safe English without only-dev steps as primary body.
4. Updater `errorMessage` → codes + i18n in Settings (stop raw English append).
5. Seed user page titles by locale.
6. Rename `settings.webNextEdition` key; tone-pass `settings.tokenThemePack` / update description (catalog, not structural hardcode).

---

## Out of scope (not UI strings)

- CLI help text (`src/cli/main.ts`)
- Runtime HTTP error bodies for non-UI clients
- DomainCommandError English (currently not mapped to toast UI)
- Architecture docs under `docs/`
- Packaging artifact name hardcodes (see `hardcode-audit-desktop.md`)

## Sign-off

Read-only scan complete. Product code unchanged. Report path: `docs/reviews/worklogs/hardcode-audit-ui-strings.md`.

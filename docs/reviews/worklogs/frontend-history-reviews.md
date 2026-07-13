# Frontend / UI / copy / theme history reviews (consolidated)

| Field | Value |
| --- | --- |
| Date | 2026-07-13 |
| Mode | Read-only consolidate of prior audits + architecture headers |
| Output rule | problem → severity → rule that would have prevented it |
| Product code | not modified |

## Sources

| Track | Path |
| --- | --- |
| Theme / CSS tokens | `docs/reviews/worklogs/hardcode-audit-theme-ui.md` |
| User-facing UI strings | `docs/reviews/worklogs/hardcode-audit-ui-strings.md` |
| i18n parity / dead keys | `docs/reviews/worklogs/hardcode-audit-i18n.md` |
| EN copy | `docs/reviews/worklogs/copy-audit-en.md` |
| ZH copy | `docs/reviews/worklogs/copy-audit-zh.md` |
| Hardcode rollup | `docs/reviews/worklogs/hardcode-audit-summary.md` |
| Full-stack summary (frontend-adjacent) | `docs/reviews/f432f78a-summary.md` |
| Theme authoring rules | `docs/architecture/theme-pack-authoring.md` |
| Theme system | `docs/architecture/ui-theme-system.md` |
| Product constraints | `AGENTS.md` (UI 架构 / 主题包 / 数据架构) |

## Existing rules already on the books (brief)

These are the prevention layer this list maps onto. Gaps are either missing process checks, incomplete enforcement, or surfaces outside the rule’s stated scope.

1. Design Token + Theme Pack is the only skin surface; no second engine or `--wbn-*` dual-track (`AGENTS.md` 主题包; `ui-theme-system.md` §3–4).
2. General CSS consumes only `--cardo-*`; recipe CSS is structure/material dialect under `[data-cardo-theme]` only; no business hex in components (`theme-pack-authoring.md` §2, §5, §7).
3. Settings shells use opaque `--cardo-settings-chrome` / `settingsHover`; material via `tokens.chrome.material` → `data-cardo-chrome-material` (`theme-pack-authoring.md` §1, §4, §6).
4. Official themes must register id + recipe and pass `validate-builtin-themes` (`AGENTS.md`; authoring §3, §8).
5. Zod is the runtime boundary; no hand-duplicated business interfaces; UI must not own DB writes (`AGENTS.md` 数据架构).
6. Product-facing copy should say Cardo; no WebNext/Khaos branding to users (copy audits; rename checklist).
7. en/zh catalog parity is expected for `messages.ts` (hardcode-audit-i18n: currently complete for key sets).
8. Schema version SoT is `DATABASE_SCHEMA_VERSION`; user prose must not hardcode bare `9` (f432f78a + UI-strings audit).

Note: several failures below are not “missing rules” but “rules not applied to tray / error-screen / updater / seed / extension store,” or “no lint/CI check for the rule.”

---

## Consolidated list

Format per row: problem → severity → preventing rule.

Severity: high = user-visible breakage, mono-locale shipping UI, token bypass that breaks theme overrides, or schema/version drift in user copy; medium = consistency / jargon / architecture smell / unfinished dual surfaces; low = polish, dead keys, naming residue.

### A. Theme / CSS / tokens

| # | Problem | Severity | Rule that would have prevented it |
| --- | --- | --- | --- |
| A1 | Primary add CTA hardcodes `#60a5fa` / white (`add-views.css`); accent override and pack blue do not recolor it | high | General CSS only consumes `--cardo-*` / create tokens; no business hex (`theme-pack-authoring.md` §2.3, §7.1–7.2) |
| A2 | Box delete confirm uses `#ff3045` while item delete uses `var(--cardo-red)` — two danger reds | high | Same: product surfaces use design tokens; one semantic danger color (`theme-pack-authoring.md` §5 “不该写业务色”; UI token SoT) |
| A3 | Runtime connection banner uses fixed `#d97706` / `#dc2626` (`shell.css`); packs cannot retint status | high | Shell chrome colors via tokens or semantic status tokens, not literal hex in shared CSS |
| A4 | Selected layout/theme card rings hardcode classic blue `rgba(59,130,246,…)` instead of `color-mix` on `--cardo-blue` | high | Selection/accent rings derive from pack tokens (pattern already used by `.cardo-theme-pack-card-selected`) |
| A5 | Item-type accents are a fixed hex map (`items.css`); folder reuses classic blue, not pack blue | high | Semantic type colors either tokenized or explicitly documented as fixed taxonomy; brand blue always from `--cardo-blue` |
| A6 | Glass recipe paints settings shell with solid `#f9fafd` / `#12131c`, bypassing `--cardo-settings-chrome` | high | Settings chrome always `var(--cardo-settings-chrome)`; never recipe hex for that shell (`theme-pack-authoring.md` §1, §4, §6.3; AGENTS 主题包.3) |
| A7 | Enter-item motion flash uses fixed `rgba(78,143,255,0.18)` not selection/accent token | high | Motion highlights consume `--cardo-blue` / selection-ring tokens |
| A8 | `SettingsPanel` falls back to `'#3b82f6'` when blue missing | medium | Fallbacks come from `defaultTokens` / pack defaults, never classic-blue literals |
| A9 | Top-bar danger wash uses classic red rgba instead of `color-mix(… var(--cardo-red) …)` | medium | Danger washes mix on danger token |
| A10 | Mono color-code input uses raw `ui-monospace…` stack instead of `--cardo-font-mono` | medium | Font stacks only via font tokens / preference stacks (`theme-pack-authoring` + `ui-theme-system` font group) |
| A11 | No shared z-index ladder; literals 0–1300 across CSS and TS | medium | Elevation/z scale as token or named const module (`ui-theme-system` elevation; hardcode audit recommendation) |
| A12 | Chip size 36/40 and box Motion corner radii branched by `themeId` in components; duplicates recipe knowledge | medium | Geometry dialect via pack tokens / single presentation helper; avoid unbounded `themeId ===` in business UI (`theme-pack-authoring.md` §2: no business if-theme except rare shell with comment) |
| A13 | Deprecated `theme-recipes.css` re-export + `applyTheme` still sets unused `data-theme` alongside `data-cardo-theme` | medium | Single theme attribute surface; no dual import path / dual data attr (`AGENTS` 禁止第二套皮肤; authoring “禁止双轨”) |
| A14 | Error-screen embeds full isolated palette + font stacks (second visual system) | medium | Acceptable isolation for fatal shell, but document as intentional second surface or share minimal fatal tokens; do not expand as product theme |
| A15 | Residual comments still name retired packs (`github`/`one`) and old `theme-recipes` | low | Delete obsolete comments when dual-track is retired |
| A16 | WebNext* symbols / `web-next` folder rename residue (not user-facing) | low | Rename checklist / codename purge policy |
| A17 | Official theme id registry, recipes, packs, validate script aligned; zero `wbn-`/`khaos-` in `src/` | ok (preserve) | Registration + validate script + dual-track ban already working for id/CSS-prefix layer |

### B. i18n structure / hardcode surfaces

| # | Problem | Severity | Rule that would have prevented it |
| --- | --- | --- | --- |
| B1 | Desktop tray labels Chinese-only (`隐藏/显示/退出/退出并停止 Runtime`) regardless of UI or OS locale | high | All user-visible chrome goes through locale-aware catalogs; main-process UI respects app/OS locale (UI-strings + ZH/EN audits; f432f78a low polish) |
| B2 | Tray copy embeds architecture term “Runtime” | high | User copy uses product language (“本机服务” / “background service”), never process/architecture codenames |
| B3 | `error-screen.ts` hardcodes schema version `9` in en/zh recovery steps | high | Schema SoT is `DATABASE_SCHEMA_VERSION`; never bare numeric schema in user prose (f432f78a H/M; UI-strings) |
| B4 | `error-screen.ts` dual-locale map is a developer runbook (npm scripts, ui-system, web-runtime, preferences 列, data authority) | high | Fatal UI is end-user recovery first; tech paths only under collapsible technical detail; product name Cardo only |
| B5 | Desktop `showErrorBox` startup dialog English-only monorepo runbook (`npm run desktop:build`, discovery, schema) | high | Pre-UI dialogs: locale-aware, user-safe primary body; inject constants not prose literals |
| B6 | Updater `errorMessage` strings English-only; Settings About appends raw English after i18n label | high | Domain/update errors: stable codes + i18n messages; never raw English as primary Settings copy |
| B7 | hostPlatform / RuntimeClient / compatibility throws are engineering English that can surface as error summary | medium | Throw `code` + technical `message` for logs/detail; UI summary always mapped via classifier + catalog |
| B8 | Seed workspace page titles always English (`Workspaces`, `Personal`, …) while welcome tips respect locale | medium | First-run seed content follows `initialPreferences.locale` (same dual-map pattern as welcomeSeed) |
| B9 | Default new page title `'Untitled'` hardcodes English; bypasses `page.untitled` | medium | All default UI titles via i18n / locale-aware Runtime default |
| B10 | ~81 dead message keys (Zen, history ops, unfinished settings, lock/pin leftovers) still ship in catalog | medium | Catalog hygiene: delete retired keys with the feature; no unshipped Settings IA strings as live product strings |
| B11 | `layout.exitZen` remains after Zen/floating layout retirement | medium | Feature retirement includes message key deletion and layout profile force-classic already done in code |
| B12 | Key `settings.webNextEdition` retains WebNext codename (displayed value is Cardo) | medium | Public i18n keys use product vocabulary (`settings.edition` / `productName`) |
| B13 | Fragmented dual-locale maps (messages, error-screen, runtimeGuide, welcomeSeed, theme JSON, tray) with uneven quality | medium | Document intentional secondary catalogs; shared rules for product tone; prefer messages.ts when preferences locale exists |
| B14 | Extension store description names Runtime / Desktop / CLI | medium | Store/listing copy is acquisition language: “本机 Cardo / 桌面应用”, not topology |
| B15 | Brand `Cardo` in title bar / About / HTML title | ok (preserve) | Product name hardcode is acceptable; not locale copy |
| B16 | en/zh key parity complete; no missing `t()` keys in static/dynamic known paths | ok (preserve) | Closed key set + TS `WebNextMessageKey` |
| B17 | No user-facing Khaos / WebNext product branding found | ok (preserve) | Product name rule |

### C. English copy quality

| # | Problem | Severity | Rule that would have prevented it |
| --- | --- | --- | --- |
| C1 | Updates copy: “GitHub milestone releases”, “Desktop build”, packaging jargon | high | Settings/About language is product channel language, not release-pipeline monologue |
| C2 | About row “Design tokens + Theme Pack” / “Theme system” | high | About metadata uses end-user terms (“Theme packs” / hide non-product rows) |
| C3 | Feature blurb “Runtime connection toast” | high | Features describe user-visible behavior (“connection status”), not Runtime/toast implementation |
| C4 | “Chrome …” shell wording (and mild “shell tools”) in interface strings | medium | Prefer “interface / top bar / bottom bar”; avoid bare “Chrome” (browser-brand collision) |
| C5 | “Collected Items” vs product Favorites vocabulary | medium | Single product glossary: Favorites for collection surfaces |
| C6 | “Export command history” exposes Command Registry vocabulary | medium | User: activity/operation history |
| C7 | Multi-client string “connected clients” (dead key but still en locale) | medium | Sync copy talks about “open Cardo windows”, not clients |
| C8 | Theme pack en descriptions: “Soft glass chrome”, vague “App design language”, “Google AI Studio…” | medium | Pack descriptions are user-visible benefits, not mood-board notes or third-party product refs |
| C9 | Menu Title Case vs sentence case inconsistency | low | One menu casing style product-wide |
| C10 | Day-to-day canvas/menus/Favorites/Recycle Bin mostly formal | ok (preserve) | Product tone baseline |

### D. Chinese copy quality

| # | Problem | Severity | Rule that would have prevented it |
| --- | --- | --- | --- |
| D1 | error-screen zh is denser CN+EN tool salad than en (same runbook class) | high | Same as B4: consumer recovery + 技术详情 only for npm/schema/paths |
| D2 | Updates/About: GitHub 里程碑 Release、Desktop、构建、Setup、Design Token + Theme Pack | high | Product zh: 检查更新 / 安装版 / 便携版 / 主题包 — no pipeline English salad |
| D3 | Tray「退出并停止 Runtime」+ always-zh (see B1–B2) | high | Locale-aware tray + 本机服务 wording |
| D4 | Extension store zh: Runtime / Desktop / CLI topology | high | Store blurb: 浏览器打开本机工作区 / 先启动 Cardo |
| D5 | User-facing「壳层」「Runtime 连接提示」「客户端/撤销栈」「命令历史」 | medium | Glossary: 界面/顶栏底栏、连接状态、撤销记录、操作历史 |
| D6 | Classic pack zh meta:「玻璃壳层」「当前产品…尺度/变体」 | medium | Theme options/help are Settings help, not design-system author notes |
| D7 | Four of five official pack names English-only under zh; Material/SwiftUI descriptions reference source design apps | medium | Localize or deliberate brand names; descriptions = visual benefit |
| D8 | Seed EN page titles under zh UI (see B8) | medium | Locale-aware seed |
| D9 | Token label calques:「表面」「主操作」「系统 UI」; empty-state「只读视图」 | medium | Color/empty copy uses plain Chinese product terms |
| D10 | Mixed quote/ellipsis conventions across catalogs | low | One Chinese punctuation convention for UI |
| D11 | Core chrome (新建/收藏/回收站/确认) natural; runtimeGuide best product zh | ok (preserve) | Positive counterexample for error-screen rewrites |
| D12 | No slang / roadmap「后续扩展」in current catalog | ok (preserve) | Prior health-review copy policy holds |

### E. Process / CI / architecture adjacency (frontend impact)

| # | Problem | Severity | Rule that would have prevented it |
| --- | --- | --- | --- |
| E1 | `validate-builtin-themes` existed but historically not always wired into `check`/CI (noted in f432f78a; AGENTS now lists `validate:themes` in gate) | medium | Official theme changes fail CI if registration/settingsChrome/recipe drift (`AGENTS` 门禁 + authoring §8) |
| E2 | No automated lint for hex-in-shared-CSS or `themeId ===` growth | medium | Optional: stylelint/custom check that shared CSS avoids brand hex; review checklist for dialect branches |
| E3 | No automated check that tray/updater/error-screen stay in sync with messages locale policy | medium | Expand “user-facing string” gate beyond React `t()` tree, or document secondary catalogs with review checklist |
| E4 | f432f78a: recovery copy + schema hardcode called out as Desktop polish backlog | high (already in B3–B5) | Same recovery-copy rules as above |
| E5 | Growing god-files (`messages.ts`, SettingsPanel) increase copy/token drift risk | low | Modular catalogs / presentation helpers when touching next |

---

## Cross-cutting patterns (for future work)

1. Secondary surfaces escape the React i18n path: tray, showErrorBox, error-screen, updater errorMessage, seed titles, extension store. Rules must name these surfaces explicitly.
2. Architecture vocabulary leaks where engineers write recovery and About copy first: Runtime, Chrome, shell, clients, command history, Theme Pack/Design Token, GitHub milestone, schemaVersion, npm scripts.
3. Token dual-track by CSS class prefix is largely fixed (`--cardo-*` only); remaining dual-track is hex bypass + dual data-theme attr + deprecated recipe import.
4. Dead i18n and unfinished Settings keys read as draft product; prune or wire before shipping advanced theme UI.
5. Glass settings hex and text-shell motion scale were already written into `theme-pack-authoring.md` lessons; glass hex regression shows authoring rules need code review / validate, not docs alone.

---

## Suggested prevention checklist (not executed here)

When changing frontend/UI/theme/copy:

1. Shared CSS: no new brand/status hex; use `var(--cardo-*)` or `color-mix` on tokens.
2. Settings/long-text shells: only `--cardo-settings-chrome` / material attribute path.
3. New official theme: register id + recipe + JSON + validate script + build smoke + light/dark eye check.
4. User-visible string: messages.ts (or documented dual map) en+zh; no architecture codenames; no bare schema numbers.
5. Main-process / updater / fatal screens: same product glossary; locale-aware where UI can be en.
6. Feature retirement: delete message keys and themeId branches with the feature.
7. After multi-agent edits: format + format:check (AGENTS).

---

## Priority if implementing next (from audits, not re-ranked innovatively)

1. error-screen: formal product recovery + dynamic schema + tech detail collapse (en/zh).
2. Tray locale + drop Runtime jargon; startup showErrorBox user-safe.
3. Updater error codes → i18n in Settings.
4. Tokenize high-traffic CSS hex (CTA, delete red, banner, selection rings, glass settingsChrome).
5. Rewrite About/Updates/feature blurbs; Favorites glossary; prune dead keys (exitZen first).
6. Locale-aware seed page titles; pack description tone pass.
7. Collapse dual `data-theme` / theme-recipes re-export; chip/radius dialect consolidation when next theme lands.

## Sign-off

Consolidated from the listed reviews only. Absolute path of this file:

`D:\Workspace\KhaosBox\docs\reviews\worklogs\frontend-history-reviews.md`

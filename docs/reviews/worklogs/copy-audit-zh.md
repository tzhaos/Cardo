# Chinese user-facing copy audit

Date: 2026-07-13  
Scope: READ-ONLY. Product code not modified.  
Product: Cardo  
Locale under review: `zh` / zh-CN (catalog key `zh`)

## Criteria (flag if)

1. 口语/对话体（「哎呀」「咱们」「搞定」等）
2. 草稿/计划体（「后续」「待定」「TODO」「v0.4 路线图」「暂时」作为产品承诺）
3. 啰嗦、解释过度、开发者旁白
4. 中英混杂不专业
5. 内部代号（WebNext、Khaos、OPFS、Runtime 架构黑话、壳层等）暴露给用户
6. 错别字、标点混乱、半截句
7. 与 Cardo 产品定位不符的临时文案

## Method

| Surface | Path |
| --- | --- |
| Primary i18n catalog | `src/web/i18n/messages.ts` (`WEB_NEXT_MESSAGES.zh`) |
| Settings search keywords | `src/web/features/settings/settingsSearchCatalog.ts` |
| Theme look labels | `src/web/features/settings/themeLookPresets.ts` |
| Built-in Theme Packs (name/description/options) | `themes/builtin/*/theme.cardo-theme.json` |
| Fatal error screen | `src/web/ui/cardo/error-screen.ts` |
| Extension connect guide | `src/extension/bootstrap/runtimeGuide.ts` |
| Extension Chrome store / action | `vite/extension-locales.ts` |
| Desktop tray | `src/desktop/main.ts` |
| Desktop pre-UI crash dialog | `src/desktop/main.ts` `dialog.showErrorBox` |
| Welcome seed tips | `src/core/database/welcomeSeed.ts` |
| Seed page titles (SQLite) | `src/core/database/initializeWorkspaceDatabase.ts` |

Not treated as user-facing product UI: code comments, architecture docs, CLI help, log lines.

## Catalog inventory

| Catalog | Notes |
| --- | --- |
| `messages.ts` en/zh | Single object; keys typed from `en`. zh block present and appears complete (parity with en keys; no missing-key scan failure by structure). |
| Locale code | App uses `zh` (`document.documentElement.lang = zh-CN` when locale is zh). Extension `_locales` maps to `zh_CN`. |
| System tabs | Collection / Recycle Bin tab labels use `t('page.collection')` / `t('page.recycleBin')`, not DB title. |
| Fragmentation | Four+ dual-locale maps: web-next messages, runtimeGuide, extension-locales, welcomeSeed, plus Theme Pack JSON and themeLookPresets. |

## Executive summary

Main product chrome (menus, boxes, pages, most Settings rows) is largely clean, professional Simplified Chinese. No hits for slang (criteria 1), no remaining roadmap/later leaks like「后续扩展」(criteria 2) in the current catalog.

The serious Chinese copy debt is not grammar — it is architecture and developer language leaking into user surfaces (criteria 3–5, 7):

1. Fatal error screen Chinese is a local-dev runbook (npm scripts, schemaVersion, ui-system, web-runtime, preferences 列).
2. Settings About / Updates expose Runtime, Desktop, GitHub milestone Release, Design Token + Theme Pack, Setup.
3. Theme pack authoring uses「壳层」and「当前产品…」meta-language.
4. Extension store description names Runtime / Desktop / CLI.
5. Desktop tray is Chinese-only and says「停止 Runtime」.
6. Seed workspace page titles are English-only in SQLite (user-visible under zh locale).

`runtimeGuide.ts` Chinese is the positive counterexample: product-facing, short, almost no architecture jargon.

---

## Findings

Issue format (same shape as EN audit):

```text
### ID — Severity
- Criteria: …
- Surface / location: …
- Key or evidence: …
- Current: …
- Problem: …
- Suggested direction: …
```

Severity: high = shipping user-visible architecture/dev copy or broken localization; medium = jargon, mixed language, or product-tone issues in normal Settings/themes; low = polish, punctuation, edge wording.

---

### ZH-01 — high

- Criteria: 3, 4, 5, 7
- Surface / location: Fatal bootstrap error screen (all surfaces when classify hits)
- Key or evidence: `src/web/ui/cardo/error-screen.ts` zh branches (~67–213, footer ~363–365)
- Current (samples):
  - 「当前 Cardo Runtime 返回的设置数据与本版本不匹配（常见于旧 Runtime 仍在运行，或数据库尚未迁移到主题系统字段）。」
  - Steps: `npm run desktop:build`、`cardo serve`、`schemaVersion 为 9`、`%APPDATA%\cardo\runtime.log`
  - Hints: 「不要混用主仓库与 ui-system 工作区的旧 Runtime 产物。」「升级后首次启动会自动迁移 preferences 列。」
  - 「Runtime 已启动，但没有提供 /app 静态页面。Desktop 需要与当前构建一致的 web-runtime 产物。」
  - 「界面需要本机 Cardo Runtime 作为数据权威。」
  - Extension step: 「npm run native-host:install 安装 Native Messaging Host。」
  - Footer: 「日志：%APPDATA%\cardo\runtime.log · discovery.json」
- Problem: Entire model is a developer recovery guide, not end-user recovery. Exposes internal repo names (ui-system), build artifact names (web-runtime), schema numbers, migration internals, and English tooling. Same problem class as EN audit of this screen, worse for zh because of dense CN+EN tool salad.
- Suggested direction: User-facing title + short summary only (「无法打开工作区」「请先启动 Cardo」). Steps: reopen Desktop / reinstall / check same version. Put npm paths, schemaVersion, discovery.json, ui-system under「技术详情」only, or support docs — never primary checklist for zh consumers.

---

### ZH-02 — high

- Criteria: 4, 5, 7
- Surface / location: Settings → About → Updates
- Key or evidence: `messages.ts` zh  
  - `settings.updateDescription`  
  - `settings.updateIdle`  
  - `settings.updateUnsupported`  
  - `settings.updateInstallChannel.setup`  
  - `settings.updateReadyPortable` / `settings.updateInstallingPortable`  
  Mounted in `SettingsPanel.tsx` DesktopUpdatePanel.
- Current:
  - 「从 GitHub 里程碑 Release 检查 Desktop 更新」
  - 「可检查 GitHub 是否有更新的 Desktop 构建。」
  - 「仅打包后的 Desktop 支持应用内更新。」
  - 「安装版 (Setup)」
- Problem: Release/milestone/Desktop/构建/Setup are engineering release-pipeline words. Users need「检查更新 / 安装版 / 便携版」, not GitHub milestone Release.
- Suggested direction: e.g. 「检查并安装 Cardo 桌面版更新」; idle「可检查是否有新版本」; unsupported「当前运行方式不支持应用内更新」; setup「安装版」without English Setup.

---

### ZH-03 — high

- Criteria: 4, 5
- Surface / location: Settings → About details
- Key or evidence: `settings.tokenThemePack` = 「Design Token + Theme Pack」; shown as `settings.themeSystem` value in About (`SettingsPanel.tsx` ~929–930)
- Current: 「Design Token + Theme Pack」
- Problem: Pure architecture brand string in the only About metadata row besides version. Zero Chinese product meaning.
- Suggested direction: 「主题包」or「内置主题系统」; drop Design Token from user UI. (Key name `webNextEdition` is internal; value is already「Cardo」— keep value, ignore key.)

---

### ZH-04 — high

- Criteria: 4, 5, 7
- Surface / location: Chrome Web Store / browser extension listing (build-time `_locales`)
- Key or evidence: `vite/extension-locales.ts` zh `extensionDescription`
- Current: 「本机 Cardo Runtime 的浏览器客户端。通过工具栏打开；需要 Cardo Desktop 或 CLI。」
- Problem: Store blurb is user acquisition copy. Runtime / Desktop / CLI are internal surface names. End users should hear「本机 Cardo」/「桌面应用」, not Runtime topology.
- Suggested direction: e.g. 「在浏览器中打开本机 Cardo 工作区。请先安装并启动 Cardo。」

---

### ZH-05 — high

- Criteria: 5; also localization gap (zh-only hardcode)
- Surface / location: Desktop system tray menu
- Key or evidence: `src/desktop/main.ts` ~304–317  
  - 「隐藏 Cardo」/「显示 Cardo」  
  - 「退出」  
  - 「退出并停止 Runtime」
- Problem: (1) Always Chinese regardless of OS/UI locale — English users get Chinese tray. (2)「Runtime」is architecture jargon; force-stop is advanced and should not name the process type.
- Suggested direction: Localize tray from app locale or OS locale; rename e.g. 「退出并停止本机服务」or「退出并结束所有 Cardo 连接」. Prefer shorter advanced wording consistent with EN audit.

---

### ZH-06 — medium

- Criteria: 5, 7
- Surface / location: Settings feature toggles + density/interface strings (some advanced keys may be dead; feature list is mounted under General)
- Key or evidence:  
  - `settings.feature.chrome.runtimeBannerDescription` → 「Runtime 连接提示」  
  - `settings.interfaceDescription` → 「壳层与工作区工具」  
  - `settings.layout.classicDescription` → 「壳层始终显示」  
  - `settings.featuresDescription` / `settings.advancedInterface*` / `settings.densityDescription` → 壳层…  
  - `settings.multiClientDescription` → 「已连接客户端共享当前页与撤销栈」  
  - `settings.operationLogDescription` → 「导出命令历史」
- Current: see above
- Problem: 「壳层」is chrome jargon from architecture docs, not consumer Chinese. 「Runtime」「客户端」「撤销栈」「命令」are multi-client / Command Registry internals. Feature banner description should match its title「连接状态」without Runtime.
- Suggested direction: 壳层 → 界面/工具栏/顶栏底栏; Runtime → 连接; 撤销栈 → 撤销记录; 命令历史 → 操作历史.

---

### ZH-07 — medium

- Criteria: 3, 5, 7
- Surface / location: Built-in Theme Pack JSON (Settings theme list + options when advanced theme options surface)
- Key or evidence: `themes/builtin/classic/theme.cardo-theme.json`  
  - description zh: 「柔和玻璃壳层。」  
  - option `chrome.surface` label: 「壳层表面」  
  - description: 「玻璃为当前产品默认壳层；实心为可选变体。」  
  - corners description: 「默认与当前产品圆角尺度一致。」
- Problem: Author/meta voice (「当前产品」「变体」「尺度」) and 壳层. Sounds like design-system notes, not Settings help.
- Suggested direction: e.g. description「柔和半透明界面」; surface「界面材质」; 「玻璃为默认，实心为不透明」; corners「使用默认圆角」.

---

### ZH-08 — medium

- Criteria: 4
- Surface / location: Built-in theme pack display names
- Key or evidence:  
  - fluent: 「Windows Fluent」  
  - glass: 「Glass」  
  - material: 「Material」  
  - swiftui: 「SwiftUI」  
  - classic alone is localized: 「经典」
- Problem: Four of five official pack names are English-only under zh. Acceptable if intentional brand names, but inconsistent with classic and with look presets (海雾/暮光…). Material description「Google AI Studio 设计风格」and SwiftUI「App 设计风格」also read as temporary/reference labels (criteria 7).
- Suggested direction: Localize or brand: Glass→玻璃, Material keep or「质感」, SwiftUI→「苹果风」/「轻盈」, Fluent→「Windows 风格」; rewrite descriptions to product benefits, not source design apps.

---

### ZH-09 — medium

- Criteria: 4, 5 (extension path milder)
- Surface / location: Extension runtime guide; Desktop crash dialog
- Key or evidence:  
  - `runtimeGuide.ts` zh schema_mismatch step: 「退出桌面端或执行 cardo stop」  
  - `main.ts` showErrorBox: English-only title/body with npm and schemaVersion (no zh)
- Problem: Guide is mostly good product Chinese; `cardo stop` is CLI-facing. Desktop fatal dialog never localizes — Chinese OS users see full English dev checklist before UI loads.
- Suggested direction: Guide: 「完全退出 Cardo 桌面应用」without CLI unless detail expand. Crash dialog: zh strings or minimal bilingual; hide npm from primary message.

---

### ZH-10 — medium

- Criteria: 4, 6 (product localization gap, not typo)
- Surface / location: First-run workspace page titles
- Key or evidence: `initializeWorkspaceDatabase.ts` inserts `Collection`, `Workspaces`, `Personal`, `Inspiration`, `Recycle Bin` regardless of `initialPreferences.locale`
- Problem: Under Chinese UI, user pages stay English forever (system Collection/Recycle Bin tabs are overridden in UI; user pages are not). Welcome box/tips are zh when locale is zh — inconsistent first impression.
- Suggested direction: Seed titles from locale map (工作区 / 个人 / 灵感 / …) or neutral icons-only defaults; never ship EN-only content when ensureInitialized locale is zh.

---

### ZH-11 — medium

- Criteria: 3, 5 (mild)
- Surface / location: Empty states / CSS expert strings
- Key or evidence:  
  - `page.collectionEmpty`: 「…拖到顶部“收藏”即可添加只读视图。」  
  - `settings.cssSnippetHint`: 「请优先写 Cardo 根节点下的选择器。」  
  - `settings.cssSnippetInvalid`: 「片段校验失败，未应用。」
- Problem: 「只读视图」is implementation-shaped; CSS hint is correct for experts but「根节点」is DOM jargon. Empty-state second sentence is slightly long.
- Suggested direction: 「…即可添加到收藏（只读）。」; CSS hint「请使用 Cardo 界面内的选择器」or drop hint.

---

### ZH-12 — medium

- Criteria: 4
- Surface / location: Settings color override labels / font
- Key or evidence:  
  - `settings.colorOverride.surface` → 「表面」  
  - `settings.colorOverride.createBackground` → 「主操作」  
  - `settings.colorOverride.panel` → 「面板」  
  - `settings.fontFamily.systemUi` → 「系统 UI」
- Problem: Literal token translations. 「表面」is opaque; 「主操作」vague; 「系统 UI」half-English.
- Suggested direction: 表面→卡片背景; 主操作→按钮/强调按钮背景; 系统 UI→系统字体.

---

### ZH-13 — low

- Criteria: 6 (punctuation consistency)
- Surface / location: Catalog-wide
- Key or evidence:  
  - messages.ts zh uses ASCII `"…"` style quotes in many strings  
  - runtimeGuide uses fullwidth「」  
  - Ellipsis: `...` in placeholders vs `…` in update strings
- Problem: Mixed Chinese quotation/ellipsis conventions across surfaces (not wrong per string, but uneven product polish).
- Suggested direction: Prefer「」or “” consistently; use `…` in UI Chinese.

---

### ZH-14 — low

- Criteria: 3 (mild wordiness) / 6 (slight incompleteness)
- Surface / location: Settings data / add flows
- Key or evidence:  
  - `settings.importDataDescription`: 「用备份文件替换」  
  - `add.folderTitle`: 「添加文件夹项目」  
  - `settings.colorOverride.presets`: 「{label}预设色」 (no separator)
- Problem: Import line feels truncated (替换什么？). Folder title slightly redundant. Preset label may glue as「画布预设色」OK, but「强调色预设色」doubles 色.
- Suggested direction: 「用备份替换当前工作区」; 「添加文件夹」; 「{label}的预设」.

---

### ZH-15 — low

- Criteria: 1 (mild warm tone only — not slang)
- Surface / location: Welcome seed
- Key or evidence: `welcomeSeed.ts` zh title「初次见面」; tip「你好，欢迎来到 Cardo。…」; multi-sentence tips on paste/layout
- Problem: Not slang; onboarding voice is intentional. Tips are longer than chrome strings (criteria 3 borderline). 「临时盒」is fine product term.
- Suggested direction: Keep warm title; optionally tighten tips to one short line each. No flag as must-fix unless brand voice wants colder chrome-only tone.

---

### ZH-16 — low

- Criteria: 4 (search only)
- Surface / location: Settings search keywords
- Key or evidence: `settingsSearchCatalog.ts` zh arrays include bare `fluent`, `hover`
- Problem: English tokens in zh keyword lists help bilingual search; not displayed as labels. Low risk unless search chips ever surface keywords.
- Suggested direction: Keep for recall or add Chinese synonyms only; do not show raw keywords in UI.

---

## Clean / positive

| Area | Note |
| --- | --- |
| Core chrome menus | 新建/删除/撤销/收藏/回收站 wording is natural and product-shaped |
| Box / item dialogs | 移至回收站 / 永久删除 clear |
| `runtimeGuide.ts` | Best zh product copy in repo; short codes and steps; almost no architecture leak |
| Roadmap language | No「后续扩展」「待定」「v0.4 路线图」in current messages (prior health-review fix holds) |
| Slang | No「哎呀」「咱们」「搞定」 |
| Forbidden codenames | No user-visible WebNext / Khaos / OPFS string values (`webNextEdition` displays「Cardo」) |
| Theme look names | 海雾 / 暮光 / 林间 / 空灵 etc. intentional brand tone — do not flatten unless brand review says so |
| System tab override | Collection/Recycle Bin use i18n keys in tab UI |

---

## Severity rollup

| Severity | Count (this doc) | Themes |
| --- | --- | --- |
| high | 5 | error-screen runbook; update/about pipeline jargon; extension store; tray Runtime + zh-only |
| medium | 7 | 壳层/Runtime/命令; theme pack meta; EN pack names; seed EN titles; empty/CSS; color labels |
| low | 4 | punctuation; incomplete microcopy; welcome length; search keywords |

---

## Suggested rewrite priority (no code changes in this audit)

1. Rewrite `error-screen.ts` zh (and align EN) into consumer recovery + collapsible tech detail.
2. Rewrite Settings update + About `tokenThemePack` / update* keys.
3. Tray: locale-aware + drop「Runtime」.
4. Extension store description without Runtime/CLI.
5. Global replace user-facing「壳层」→ product words; classic pack option descriptions.
6. Locale-aware seed page titles.
7. Polish medium/low keys when touching Settings/themes.

---

## Out of scope / non-findings

- Internal TypeScript names (`WebNextApp`, `translateWebNext`) — not rendered.
- History operation title keys if only used in non-UI export paths — still product-adjacent if ever shown; wording is fine (「已删除盒子」).
- Dead advanced Settings keys still in catalog: if re-mounted, apply ZH-06 before ship; do not use roadmap apologies (policy from prior health review).

---

## Appendix A — High-signal zh strings (quick table)

| Key / location | Current zh | Criteria |
| --- | --- | --- |
| error-screen PREFERENCES summary | Runtime / 主题系统字段 / 迁移 | 3,5,7 |
| error-screen steps | npm / schemaVersion / ui-system | 3,4,5 |
| `settings.updateDescription` | GitHub 里程碑 Release / Desktop | 4,5 |
| `settings.tokenThemePack` | Design Token + Theme Pack | 4,5 |
| `settings.feature.chrome.runtimeBannerDescription` | Runtime 连接提示 | 5 |
| `settings.*壳层*` | 壳层… | 5 |
| `settings.multiClientDescription` | 客户端 / 撤销栈 | 5 |
| extension-locales description | Runtime / Desktop / CLI | 4,5 |
| tray | 退出并停止 Runtime | 5 |
| classic pack description | 玻璃壳层 / 当前产品 | 5,7 |
| seed pages | Workspaces / Personal / … | 4,6/localization |
| `page.collectionEmpty` | 只读视图 | 5 mild |

## Appendix B — Surfaces scanned with no criteria 1–2 hits

- `messages.ts` zh menus, history, box/item dialogs, search, most appearance labels
- `runtimeGuide.ts` codes (except mild CLI in schema_mismatch)
- `themeLookPresets.ts` look names
- `welcomeSeed.ts` (warm tone only; no slang/roadmap)

End of audit.

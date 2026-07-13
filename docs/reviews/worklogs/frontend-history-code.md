# Frontend history — code patterns for AGENTS frontend rules

Date: 2026-07-13  
Scope: read-only scan of `src/web-next` and related UI (themes, i18n, desktop-adjacent error/tray already covered in hardcode audits).  
Product code and `AGENTS.md` / `Agents.md` not modified.

Purpose: inventory patterns that future AGENTS frontend rules should forbid or require. Complements review-track consolidation in `frontend-history-reviews.md` and hardcode audits (`hardcode-audit-theme-ui.md`, `hardcode-audit-ui-strings.md`, `hardcode-audit-i18n.md`).

---

## Theme list (official)

Source of truth: `OFFICIAL_BUILT_IN_THEME_IDS` in `src/core/contracts/themePack.ts`.

| id | Default | Pack JSON | Recipe entry (`OFFICIAL_THEME_RECIPE_ENTRIES`) |
| --- | --- | --- | --- |
| `classic` | yes (`OFFICIAL_DEFAULT_THEME_ID`) | `themes/builtin/classic/theme.cardo-theme.json` | `src/web-next/styles/themes/classic.css` |
| `glass` | | `themes/builtin/glass/…` | `src/web-next/styles/themes/glass/index.css` |
| `fluent` | | `themes/builtin/fluent/…` | `src/web-next/styles/themes/fluent/index.css` |
| `material` | | `themes/builtin/material/…` | `src/web-next/styles/themes/material/index.css` |
| `swiftui` | | `themes/builtin/swiftui/…` | `src/web-next/styles/themes/swiftui/index.css` |

Load path: `import.meta.glob` in `src/web-next/themes/builtInPacks.ts` → registry in `themeRegistry.ts`.  
Validate: `npx tsx scripts/validate-builtin-themes.ts` / `npm run validate:themes`.  
Token key of special interest: `settingsChrome` → CSS var `--cardo-settings-chrome` (must stay opaque for long text shells).

---

## i18n entry points

| Role | Path | Notes |
| --- | --- | --- |
| Primary catalog | `src/web-next/i18n/messages.ts` | `WEB_NEXT_MESSAGES` en + zh; types `WebNextLocale`, `WebNextMessageKey`; `translateWebNext` |
| React hook | `src/web-next/i18n/useI18n.ts` | locale from `preferencesStore`; `t(key, params?)` |
| Settings search index | `src/web-next/components/settings/settingsSearchCatalog.ts` | keys only; labels via `t()` |
| Theme pack name/desc | `themes/builtin/*/theme.cardo-theme.json` | intentional dual `name.en` / `name.zh` (not messages.ts) |
| Theme look presets | `src/web-next/components/settings/themeLookPresets.ts` | dual-locale map (intentional) |
| Fatal bootstrap UI | `src/web-next/ui/cardo/error-screen.ts` | dual-locale inline; not preferences; not messages.ts |
| Extension connect guide | `src/extension/bootstrap/runtimeGuide.ts` | dual-locale; separate SoT |
| Extension Chrome locales | `vite/extension-locales.ts` → `_locales` | store / action |
| Welcome seed | `src/core/database/welcomeSeed.ts` | dual locale written into DB at init |
| Desktop tray / crash | `src/desktop/main.ts` | no catalog today (audit debt) |
| Update errors | `src/desktop/update/*` | English `errorMessage` surfaces in Settings |

Required pattern for new product chrome: add en+zh keys in `messages.ts`, consume only via `useI18n().t` / `translateWebNext`. Do not invent a second catalog for in-app React UI.

---

## Good patterns

### 1. Command write path is Runtime-only

- Stores expose `fireCommand` / `dispatchCommand` → `dispatchDatabaseCommand` → RuntimeClient.
- UI components do not import Drizzle or open SQLite.
- Preferences and workspace mutations share the same enqueue + command types.

Files: `src/web-next/app/stores/workspaceStore.ts`, `preferencesStore.ts`, `src/web-next/platform/hostPlatform.ts`.

### 2. Drag / resize frame rate does not write the DB

- Box drag: `uiStore.updateBoxDragFrame` mutates `latestFrame` in place and returns the same state root so React is not re-rendered at pointer rate; motion values own visuals.
- Box resize: motion values update on move; `updateBoxFrame` only on `onEnd`.
- Collection frames: same session pattern (`onMove` motion values, `onEnd` → `onFrameChange`).
- Item reorder: staged order locally; `reorderItems` / `moveItemBetweenBoxes` on drag end.
- Page tabs: `reorderPages` on reorder end, not per-move.
- Store comment documents local-only `previewBoxOnPage` and requires release commit.

Files: `uiStore.ts` (`updateBoxDragFrame`), `BaseBoxFrame.tsx` (`beginResize` / drag session), `CollectionPage.tsx`, `SortableItemList.tsx`, `TopBar.tsx`.

### 3. Settings text shell is opacity-only and integer geometry

`SettingsWindow` documents and implements:

1. position with `left`/`top` (not transform x/y),
2. integer CSS pixels,
3. enter/exit opacity only (no scale on the shell).

Static nav indicator for themed shells (no Motion `layoutId` under text) is intentional in `SettingsPanel`.

### 4. HoverTip / IconButton.tooltip for chrome

- `ui/cardo/hover-tip.tsx` wraps Radix Tooltip; preferred for toolbar icons.
- `HistoryToolbar`, `BottomToolbar` pass `tooltip={t(...)}` through `IconButton`.
- App root wraps `TooltipProvider` in `WebNextApp`.

### 5. Class and CSS variable prefix is `cardo-*` only

- Grep for `wbn-` / `khaos-` under `src/`: zero matches.
- `applyTheme` writes only `--cardo-*` and documents “no dual-track legacy palette vars”.
- Components use `cardo-*` classes + limited `cardo-ui-*` primitives.

### 6. Theme system layering is mostly respected in recipes

- Official packs: JSON tokens + `[data-cardo-theme="<id>"]` recipe CSS.
- Fluent settings shell uses `var(--cardo-settings-chrome)` (not raw white).
- `settingsChrome` is overridable and wired in Settings color overrides + i18n key `settings.colorOverride.settingsChrome`.
- Built-in load fails hard if official id missing or unregistered.

### 7. In-app chrome copy is mostly i18n-backed

- Top bar, boxes, items, settings rows, search, history toolbar, runtime banner labels route through `messages.ts`.
- No user-facing product string `Khaos` or brand `WebNext` (About value is `Cardo`; key `settings.webNextEdition` is legacy naming only).

### 8. ui/primitives vs ui/cardo split is used

- Business UI imports primitives (Button, Input, Select, Tabs, Switch) and cardo wrappers (IconButton, HoverTip, context-menu).
- Product-specific canvas / box / tab structure stays outside shadcn defaults.

### 9. Dead legacy layout key is catalog-only

- `layout.exitZen` exists in en/zh messages only; no component references. Zen is retired from code paths (safe dead key; prune candidate).

---

## Risky patterns

These are the concrete shapes AGENTS frontend rules should forbid or tightly gate.

### A. `themeId === '…'` in components (recipe knowledge in TS)

| Location | Branch | Risk |
| --- | --- | --- |
| `BaseBoxFrame.tsx` | fluent / material / glass / swiftui / classic corner radius tables | Geometry dialect re-implemented outside token/recipe |
| `BottomToolbar.tsx` | `isFluent`; chip size 36 vs 40 for swiftui/fluent | Dock metrics not driven by tokens |
| `TopBar.tsx` | `isFluent` (canvas tools placement) | Shell topology in TS |
| `SettingsPanel.tsx` | `isSwiftUI` traffic lights; static nav for glass/fluent/material/swiftui | Acceptable shell capability if documented; still id-hardcoded |
| `SettingsNavIcons.tsx` | `themeId === 'fluent'` | Icon pack branch |
| `preferencesStore` | `state.themeId === themeId` | Equality for no-op only — OK |

Rule direction: forbid business logic `if (themeId === 'X')` except rare shell capability with a comment; prefer tokens (`radii`, space) and recipe CSS under `[data-cardo-theme]`.

### B. Hardcoded `#hex` outside SoT

Legitimate SoT (do not treat as debt): `tokens.css`, `defaultTokens.ts`, `themes/builtin/**`, `colorPresets.ts`, `themeLookPresets.ts`, intentional recipe material mixes.

Risky product surfaces (from code + `hardcode-audit-theme-ui.md`):

| Area | Example | Why forbid |
| --- | --- | --- |
| Shared product CSS | add CTA `#60a5fa`; box delete `#ff3045`; runtime banner amber/red; item type accents | User accent / pack overrides do not recolor |
| Glass settings | hardcoded shell backgrounds | Bypasses `settingsChrome` / authoring rule |
| Selection rings | rgba classic blue | Should be `color-mix` with `var(--cardo-blue)` |
| error-screen | full private palette | Second visual system (fatal path — gate as intentional) |

Rule direction: product CSS colors via `--cardo-*` only; dual delete reds (`#ff3045` vs `--cardo-red`) forbidden; recipe hex only for structure/material dialect, not brand tokens.

### C. Native `title=` instead of HoverTip / tooltip

| Location | Pattern |
| --- | --- |
| `BaseBoxFrame` header actions | `title={t('box.…')}` on controls |
| `CollectionPage` toolbar buttons | same |
| `CanvasToolsToolbar` | `title={item.label}` on IconButton (also has aria-label; no `tooltip` prop) |
| `TopBar` Fluent canvas tools | same dual title/aria without HoverTip |
| `ClipboardItem` | native title for copy |
| `BoxAppearancePopover` | color picker label title |
| `TabPill` | system tab title (aria-adjacent) |
| Settings color swatches | `title={preset.value}` (hex string — not i18n tip) |

Good contrast: `HistoryToolbar` / `BottomToolbar` use `tooltip={t(...)}` → HoverTip.

Rule direction: toolbar/icon chrome must use `IconButton` `tooltip` / `HoverTip`; reserve native `title` for non-chrome (e.g. truncated text overflow) or aria-only cases with comment.

### D. User-facing strings outside `messages.ts`

| Pattern | Example |
| --- | --- |
| Store default English | `createPage: (title = 'Untitled')` in `workspaceStore` — should use locale / `page.untitled` at call site |
| Brand in JSX | `Cardo` in About / title bar / error mark (acceptable product name; optional key) |
| Fatal / tray / updater | dual-locale or mono-locale outside catalog (see hardcode-audit-ui-strings) |
| Seed page titles | English-only in DB for user pages |
| Internal type names | `WebNextApp`, `translateWebNext`, `WebNextLocale` — code only; rename over time, not user-facing |

Hardcoded CJK outside messages under `src/web-next` components: essentially none (CJK lives in `messages.ts` zh block and intentional dual maps).

Rule direction: no JSX string literals for chrome labels; no second ad-hoc locale map for React product UI; fatal/tray must either join messages or be documented dual-locale SoT.

### E. Scale animation on text-heavy shells

Forbidden by theme authoring for settings-like text shells; SettingsWindow complies.

Still present elsewhere:

| Location | Use | Severity |
| --- | --- | --- |
| `GlobalSearchPanel` | enter/exit scale ~0.98 on result panel | medium — text list under scale |
| `CollectionPage` collection box | enter/exit scale | medium — card shell with text |
| `ItemContentEditView` / `ItemDeleteView` | scale on edit/delete overlays | medium — text forms |
| `ClipboardItem` inline views | scale | medium |
| `SortableItemList` / tabs | drag scale — spatial affordance | lower if not long-form text |
| Box drag compact scale | intentional geometry | OK for canvas objects |
| `BottomToolbar` / `IconButton` whileTap scale | icon chrome | OK |
| `fluent/shell.css` scale 0.97 | recipe press | review if applied to text shells |
| `SettingsPanel` comment | explicitly forbids Motion scale under Fluent text | good |

Rule direction: long-lived text shells (settings, dense lists, edit forms): opacity (± translate) only; no scale enter/exit; integer geometry; no transform-based positioning for those shells.

### F. Legacy product naming residue

| Symbol / key | Status |
| --- | --- |
| `wbn-` / `khaos-` classes or CSS vars | Clean (0 in `src/`) |
| `WebNext*` module/type names | Internal only; product display is Cardo |
| `settings.webNextEdition` | Display value `Cardo`; key name is legacy |
| `layout.exitZen` | Dead key (en+zh only) |
| `applyTheme` dual `dataset.cardoTheme` + `dataset.theme` | Dual data attributes; recipes use `data-cardo-theme` only |
| `theme-recipes.css` deprecated re-export | Second import path risk |

Rule direction: forbid new `wbn-`/`khaos-`/`WebNext` user strings; forbid dual CSS class/var tracks; prefer single `data-cardo-theme`; prune dead keys.

### G. fireCommand / dispatch during drag (must stay end-only)

Current code is largely correct. Risks to forbid:

1. Calling `updateBoxFrame` / collection frame commands inside `onMove` / pointer-move.
2. Calling `reorderItems` / `reorderPages` / `moveItemBetweenBoxes` per reorder frame instead of staged end.
3. Firing workspace snapshot or full projection replace from drag controllers.
4. Preferences/theme commands from drag paths (no current hit).

Allowed: local Zustand mutation of drag session geometry; motion value updates; optimistic preview with explicit revert; command only on release / confirm.

### H. settingsChrome misuse

- Contract requires `settingsChrome` on pack colors; maps to `--cardo-settings-chrome`.
- Fluent recipe correctly consumes the var.
- Glass recipe still has hardcoded settings backgrounds in places (audit).
- Override presets exist in `colorPresets.ts` under `settingsChrome`.

Rule direction: settings and other long-text shells must paint with `var(--cardo-settings-chrome)` (opaque); material via `data-cardo-chrome-material`, not per-theme `backdrop-filter` forks alone.

### I. Product string / architecture leakage in catalog

Still in messages (quality, not structure): GitHub/milestone wording, Design Token jargon, key names like `webNextEdition`, dead Zen and unused history op labels. Catalog is the right place — wording should stay user-facing.

---

## Suggested AGENTS frontend rule bullets (draft only — not applied)

Require:

1. In-app UI strings only via `messages.ts` + `useI18n` / `translateWebNext` (en+zh same keys).
2. Theme paint via `--cardo-*` and Theme Pack tokens; official ids only from `OFFICIAL_BUILT_IN_THEME_IDS` + validate script.
3. New official theme: pack JSON + recipe entry + registry id + `validate:themes`.
4. Drag/resize: no Command/DB/full Workspace commit on pointer frames; commit on end.
5. Text shells: opacity enter/exit, integer left/top, no scale, use opaque `settingsChrome`.
6. Toolbar tips: `HoverTip` / `IconButton.tooltip`, not native `title` for icon chrome.
7. UI structure: compose `ui/primitives` + `ui/cardo`; no second skin engine; no dual `wbn-`/`khaos-` track.
8. Class prefix `cardo-*`; theme attribute `data-cardo-theme`.

Forbid:

1. `themeId === '<official-id>'` for business styling except documented shell capability.
2. Hardcoded brand/status hex in shared product CSS when a token exists.
3. JSX chrome copy outside i18n; mono-locale tray/dialogs without catalog plan.
4. Scale animation on settings-like text shells; transform positioning of those shells.
5. `fireCommand` / `dispatchDatabaseCommand` during active drag/resize move handlers.
6. New dual-track class/var prefixes or dual theme data attributes without migration plan.
7. User-facing “WebNext” / “Khaos” branding; dead UX keys without UI (e.g. `layout.exitZen`) in new code.

---

## Scan method (reproducible)

```text
themeId ===          src/  (especially web-next/components)
#[0-9a-fA-F]{3,8}    src/web-next **/*.{css,tsx,ts}
title=               src/web-next/components
wbn-|khaos-          src/
scale / whileTap     src/web-next (tsx + css)
fireCommand|updateBoxFrame|updateBoxDragFrame
WebNext|layout.exitZen|settingsChrome
OFFICIAL_BUILT_IN_THEME_IDS / themes/builtin/*
messages.ts / useI18n.ts / error-screen.ts / runtimeGuide.ts
```

Related worklogs: `hardcode-audit-theme-ui.md`, `hardcode-audit-ui-strings.md`, `hardcode-audit-i18n.md`, `hardcode-audit-summary.md`, `frontend-history-reviews.md`, `docs/architecture/theme-pack-authoring.md`.

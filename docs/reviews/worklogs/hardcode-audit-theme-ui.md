# Hardcode audit — Theme / CSS / UI tokens (dual-track forbidden)

Date: 2026-07-13  
Scope (read-only): `src/web/styles/**`, `src/web/styles/themes/**`, `src/web/themes/**`, `src/web/features/**`, related `src/core/contracts/themePack.ts` / `preferences.ts`, `themes/builtin/**`.  
Product code not modified.

Severity key:

| Level | Meaning |
| --- | --- |
| high | Theme-breaking, dual-track risk, or hardcode that ignores live tokens under user theme/color overrides |
| medium | Should be tokenized or centralized; works today but drifts easily |
| low | Cosmetic / intentional dialect / comments only |
| ok | Legitimate SoT (token defaults, presets, pack JSON, platform chrome samples) |

---

## Summary

| Area | Verdict | Notes |
| --- | --- | --- |
| 1. Hardcoded hex that should be tokens | Several high | Primary CTA, delete confirm, runtime banner, selection rings, item accents, glass settings shell, motion flash |
| 2. Dual-track class names (`wbn-` / `khaos-`) | Clean in code | 0 matches under `src/`; residual comments + deprecated re-export + dual `data-theme` attr |
| 3. z-index / pixel geometry magic | Widespread medium | No z-scale module; chip size / box radius branched by `themeId` in TS |
| 4. Theme ids not registered | Clean | 5 official ids ↔ JSON packs ↔ recipe CSS ↔ validate script |
| 5. Inline styles with user-facing text | Clean | Inline styles are geometry/color only; copy via i18n |
| 6. Font family hardcodes | Mostly ok | Bootstrap stacks SoT; error-screen + mono hex-input bypass tokens |

Overall: CSS variable surface is `--cardo-*` only (no `--wbn-*` dual-track left in product code). Residual risk is recipe/component hardcodes that do not re-read tokens when users change accent or pack, plus TS `themeId ===` dialect branches that re-implement recipe knowledge.

---

## 1. Hardcoded hex colors that should be tokens

### high — product surfaces ignore accent tokens

| Path | Snippet / fact | Why |
| --- | --- | --- |
| `src/web/styles/add-views.css` (~123–124) | `.cardo-add-primary { background: #60a5fa; color: #ffffff; }` | Primary add CTA does not use `--cardo-blue` / `--cardo-create-text`; theme accent override will not recolor |
| `src/web/styles/boxes.css` (~554–556) | `.cardo-box-delete-confirm-button { background: #ff3045; color: #ffffff; }` | Delete confirm not `--cardo-red`; diverges from item delete which already uses `var(--cardo-red)` |
| `src/web/styles/shell.css` (~243–249) | Runtime banner reconnect `#d97706`, disconnect `#dc2626` | Status colors not tokens; dark/light packs cannot retint |
| `src/web/styles/settings.css` (~627–628, ~1198–1199) | Selected layout/theme cards: `rgba(59, 130, 246, 0.36/0.08)` | Hardcoded classic blue ring; should be `color-mix(... var(--cardo-blue) ...)` like `.cardo-theme-pack-card-selected` |
| `src/web/styles/items.css` (~338–354) | Item type accents: `#64748b` / `#8b5cf6` / `#3b82f6` / `#f97316` / `#10b981` | Semantic type colors fixed outside token map; folder reuses classic blue, not pack blue |
| `src/web/styles/motion.css` (~3) | `@keyframes cardo-enter-item` flash `rgba(78, 143, 255, 0.18)` | Enter highlight not tied to `--cardo-blue` / `--cardo-selection-ring` |
| `src/web/styles/themes/glass/index.css` (~140, ~160) | Settings shell `background-color: #f9fafd` / `#12131c` | Bypasses `--cardo-settings-chrome`; contradicts authoring rule that settings shells consume `settingsChrome` |

### medium — partial token use or one-off fallbacks

| Path | Snippet / fact | Why |
| --- | --- | --- |
| `src/web/styles/settings.css` (~898) | Switch thumb `background: #fff` | Always pure white; may be intentional Material-style thumb |
| `src/web/styles/settings.css` (~1171, ~1253) | Confirm/import text `#fff` / `#ffffff` on token bg | Prefer `--cardo-create-text` for consistency |
| `src/web/styles/items.css` (~513–517) | Confirm text `#ffffff`; hover mix with `#000000` | Red path uses token bg; white/black mixers still literal |
| `src/web/styles/boxes.css` (~316) | Color swatch check glyph `color: #fff` | Acceptable on swatch; optional `--cardo-create-text` |
| `src/web/styles/top-bar.css` (~260) | Danger button `rgba(239, 68, 68, 0.1)` | Classic red 10% wash; should be `color-mix(in srgb, var(--cardo-red) 10%, transparent)` |
| `src/web/features/settings/SettingsPanel.tsx` (~642, ~701, ~746, ~896) | Fallback `'#3b82f6'` when blue missing | Hardcoded classic blue fallback instead of pack default / `defaultTokens` |
| `src/web/styles/themes/fluent/overlays.css` | `var(--cardo-settings-chrome, #ffffff)` and `#000`/`#fff` in shadow mixes | Fallbacks ok; shadow tints are recipe dialect |
| `src/web/ui/cardo/error-screen.ts` (~403–566) | Full self-contained palette (`#f4f5f7`, `#111827`, …) | Fatal shell intentionally isolated from theme runtime; still a second visual system |

### ok — legitimate color SoT (not “hardcode debt”)

| Path | Role |
| --- | --- |
| `src/web/styles/tokens.css` | CSS bootstrap defaults before `applyTheme` |
| `src/web/themes/defaultTokens.ts` | TS default token map |
| `themes/builtin/*/theme.cardo-theme.json` | Official pack documents |
| `src/web/features/settings/colorPresets.ts` | User color picker chips (must stay concrete) |
| `src/web/features/settings/themeLookPresets.ts` | Curated accent looks per pack (must stay concrete) |
| `src/web/styles/themes/swiftui/settings.css` (~50–63) | macOS traffic-light `#ff5f57` / `#febc2e` / `#28c840` — platform chrome dialect in recipe |
| `src/web/styles/themes/**` heavy `#ffffff` / `#000` in `color-mix` glass tints | Recipe material dialect; acceptable if not re-expressing brand tokens |

### high residual pattern: dual delete reds

- Box delete: `#ff3045` (`boxes.css`)
- Item delete: `var(--cardo-red)` which defaults to `#ef4444` (`items.css` + `tokens.css`)

Two danger reds in the same product surface family.

---

## 2. Dual-track class names (`wbn-`, `khaos-`, leftover)

### ok — product CSS/class surface

| Check | Result |
| --- | --- |
| `wbn-` / `khaos-` in `src/**` | 0 matches |
| `--wbn-*` / `--khaos-*` CSS vars | 0 matches |
| Class prefix in components | `cardo-*` + limited `cardo-ui-*` primitives |
| `applyTheme` write path | Only `--cardo-*` (comment explicitly forbids dual-track legacy palette vars) |

Docs still mention historical `--wbn-*` migration (`docs/architecture/ui-theme-system.md`, `theme-pack-authoring.md`); that is documentation history, not live dual-track.

### medium — leftover dual surfaces / naming residue

| Path | Finding | Severity |
| --- | --- | --- |
| `src/web/styles/theme-recipes.css` | `@deprecated` re-export of `./themes/index.css` | medium — second import path for recipes; `app/styles.css` already imports `themes/index.css` directly; file can be deleted once no external refs |
| `src/web/styles/boxes.css` (~9–14) | Comment: “theme-recipes may retarget… (e.g. github → lg, one → md)” + “Material treatment comes from theme-recipes.css” | low — retired pack names (`github`, `one`) and obsolete import name in comments |
| `src/web/themes/applyTheme.ts` (~53–54) | Sets both `root.dataset.cardoTheme` and `root.dataset.theme` | medium — dual data attributes; CSS recipes only select `[data-cardo-theme=…]`; no `[data-theme]` consumers under `src/` |
| `src/web/styles/settings.css` (~912) | Comment “Legacy theme pack card styles (unused…)” while `.cardo-theme-pack-*` still used by Settings + recipes | low — stale comment; not dual-track code |
| `src/web/**` API names | `applyWebNextTheme`, `getRegisteredWebNextThemes`, `WebNextThemeDefinition`, folder `web-next` | low — rename residue (`Cardo` product / `WebNext*` types); not a second skin engine |

### ok — themeId branching that is not dual CSS track

Authoring doc allows rare shell branches with reason. Present branches:

| Path | Branch | Notes |
| --- | --- | --- |
| `components/boxes/BaseBoxFrame.tsx` | `themeId` → `BOX_CORNER_RADIUS.*` | Duplicates recipe radius dialect in TS for Motion numeric `borderRadius` |
| `components/top-bar/TopBar.tsx` | `isFluent` | Shell topology |
| `components/bottom-toolbar/BottomToolbar.tsx` | chip 36 vs 40 for fluent/swiftui | Geometry dialect in JS |
| `components/settings/SettingsNavIcons.tsx` | Fluent color icons vs mono | Icon pack dialect |
| `components/settings/SettingsPanel.tsx` | static nav indicator for glass/fluent/material/swiftui | Paint clarity branch |

These are not `wbn-` dual class tracks, but they encode official pack ids in business components (medium architecture smell if more packs ship).

---

## 3. Hardcoded z-index and pixel geometry magic numbers

### medium — no shared z-index scale

Scattered literal z values (not CSS vars / TS constants module):

| Band (approx) | Values | Paths |
| --- | --- | --- |
| Canvas / box stack | 0, 1, 4, 5, 10, 20, 30, 40, 45, 70, 100 | `styles/boxes.css`, `styles/items.css`, `styles/canvas.css` |
| Shell chrome | 50, 80, 88, 100, 120, 180, 220 | `top-bar.css`, `toolbars.css`, `shell.css`, `canvas.css`, tab `whileDrag` zIndex 80 |
| Floating menus | 120, 200, 300 | `menus.css`, `ui/cardo/context-menu.tsx` (`zIndex: 200`), items drag preview `300 !important` |
| Portaled UI | 1200, 1300 | `design-system.css` tooltip / select / menu |

Risk: stacking collisions when adding overlays; no documented z ladder.

TS inline zIndex (magic, no shared constant):

| Path | Value |
| --- | --- |
| `ui/cardo/context-menu.tsx` | 200 |
| `components/top-bar/{SortablePageTab,RecycleBinTab,CollectionTab}.tsx` | whileDrag 80 |
| `components/items/SortableItemList.tsx` | 30 |
| `components/collection/CollectionPage.tsx` | `10 + view.order` |

### medium — geometry magic numbers without named constants

| Path | Magic | Notes |
| --- | --- | --- |
| `components/bottom-toolbar/BottomToolbar.tsx` | chip size `36` / `40` by themeId | Duplicated concept in TopBar search pill |
| `components/top-bar` / bottom toolbar | same 36/40 | Should be one token or layout constant |
| `components/boxes/BaseBoxFrame.tsx` | `BOX_CORNER_RADIUS` map 16/24, 6/8, 16/20, 22/26, 14/18; compact target 160×100; scale 1.028 | Motion cannot read CSS vars as animated numbers easily — local map is pragmatic but must stay synced with recipes |
| `styles/shell.css` | banner `bottom: 72px`, `right: 20px`; titlebar `height: 40px`; settings shell `min(860px…)` × `min(620px…)` | Chrome geometry not tokenized |
| `components/collection/CollectionPage.tsx` | y clamp `72` | Same family as shell chrome inset |
| `styles/design-system.css` | select trigger `height: 34px`, `min-width: 132px`, content `max-height: 280px` | Primitive sizes; acceptable density debt |
| `domain/placement.ts` | `BOX_GAP = 24`, `SEARCH_STEP = 24`, `VIEWPORT_MARGIN = 16` | Named constants — good pattern; contrast with CSS literals |

### low — motion spring parameters

Repeated spring tuples (`stiffness: 460/500`, `damping: 38/40`, `mass: 0.68/0.72`) in TopBar / tabs / SortableItemList — animation craft, not theme tokens. Optional motion constants module only if tuning becomes multi-file thrash.

---

## 4. Theme ids registration

### ok — official set is consistent

Source of truth: `src/core/contracts/themePack.ts`

```
OFFICIAL_BUILT_IN_THEME_IDS = classic | glass | fluent | material | swiftui
OFFICIAL_THEME_RECIPE_ENTRIES maps each id → styles/themes path
```

Alignment check:

| Layer | classic | glass | fluent | material | swiftui |
| --- | --- | --- | --- | --- | --- |
| `OFFICIAL_BUILT_IN_THEME_IDS` | yes | yes | yes | yes | yes |
| `themes/builtin/<id>/theme.cardo-theme.json` | yes | yes | yes | yes | yes |
| Recipe import in `styles/themes/index.css` | `classic.css` | `glass/index.css` | `fluent/index.css` | `material/index.css` | `swiftui/index.css` |
| `OFFICIAL_THEME_RECIPE_ENTRIES` | same paths | same | same | same | same |
| `THEME_LOOK_PRESETS` keys | yes | yes | yes | yes | yes |
| `scripts/validate-builtin-themes.ts` | enforces id/folder/recipe/opaque settingsChrome | | | | |

No orphan recipe CSS directories under `styles/themes/` beyond shared infrastructure (`shared.css`, `chrome-material.css`, `index.css`).

Default id: `OFFICIAL_DEFAULT_THEME_ID = 'classic'` (`themePaths.ts`); load-time assert in `builtInPacks.ts`.

### low — dual root attribute for theme id

`applyTheme` writes `data-cardo-theme` (canonical for recipes) and `data-theme` (unused by CSS). Prefer single attribute to avoid a second unofficial selector surface.

---

## 5. Inline style strings with user-facing text

### ok

Scanned `style={{…}}` in `src/web/features/**`:

- Backgrounds from palette tokens / presets (Settings color chips)
- Geometry: height, width, flex, gap, marginTop, zIndex, boxShadow
- CSS variables: `--box-accent`, `--choice-color`

No user-facing English/Chinese copy embedded inside style strings or CSS `content: '…text…'`. CSS `content` usages are empty strings for pseudo-elements only (`shell.css`, fluent settings/overlays).

User-facing copy routes through `i18n/messages.ts` + `t(...)`.

### out of style scope (content hardcode elsewhere)

`ui/cardo/error-screen.ts` embeds English recovery steps and full themed CSS string — content/i18n debt, not token dual-track. Noted under color/fonts only.

---

## 6. Font family hardcodes

### ok — intentional SoT stacks

| Path | Role |
| --- | --- |
| `src/core/contracts/preferences.ts` `FONT_FAMILY_STACKS` | Preference ids `default` / `system-ui` / `serif` |
| `src/web/styles/tokens.css` `--cardo-font-sans` / `--cardo-font-mono` | Bootstrap before runtime apply |
| `src/web/themes/applyTheme.ts` | Writes `--cardo-font-sans` from `FONT_FAMILY_STACKS` |

Most chrome CSS uses `var(--cardo-font-sans)` (`alignment.css`, `toolbars.css`, body inherit).

### medium — bypasses

| Path | Finding |
| --- | --- |
| `src/web/styles/boxes.css` (~373) | `.cardo-box-color-code { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }` ignores `--cardo-font-mono` |
| `src/web/ui/cardo/error-screen.ts` (~407, ~479) | Hardcoded Inter / Noto / YaHei stack and mono stack; never follows preference `fontFamily` |

### low

`settings.css` mono field correctly uses `var(--cardo-font-mono)` — good reference pattern for the box color code input.

---

## Ranked finding list (actionable)

| ID | Severity | Area | Path | Issue |
| --- | --- | --- | --- | --- |
| H1 | high | color | `styles/add-views.css` | Primary button `#60a5fa` not `--cardo-blue` |
| H2 | high | color | `styles/boxes.css` | Delete confirm `#ff3045` not `--cardo-red` (≠ item delete) |
| H3 | high | color | `styles/shell.css` | Runtime banner status hex |
| H4 | high | color | `styles/settings.css` | Selected card rings hardcode classic blue rgba |
| H5 | high | color | `styles/items.css` | Item-type `--item-accent` hex map not tokenized |
| H6 | high | color | `styles/themes/glass/index.css` | Settings shell solid hex bypasses `settingsChrome` |
| H7 | high | color | `styles/motion.css` | Enter-item flash fixed blue |
| M1 | medium | dual | `styles/theme-recipes.css` | Deprecated dual import path |
| M2 | medium | dual | `themes/applyTheme.ts` | Dual `data-theme` + `data-cardo-theme` |
| M3 | medium | z/geometry | multiple CSS + TS | No z-index scale; 10–1300 literals |
| M4 | medium | geometry | BottomToolbar / TopBar | Chip 36/40 by themeId (duplicated) |
| M5 | medium | geometry | `BaseBoxFrame.tsx` | Per-theme corner radius map + 160×100 compact magic |
| M6 | medium | color | `SettingsPanel.tsx` | Fallback `#3b82f6` |
| M7 | medium | font | `styles/boxes.css` | Hex color input mono stack bypasses token |
| M8 | medium | font/color | `ui/cardo/error-screen.ts` | Isolated palette + font stacks |
| M9 | medium | architecture | Settings/TopBar/BaseBox/BottomToolbar | Growing `themeId ===` dialect surface |
| L1 | low | dual | `styles/boxes.css` comments | Retired theme ids `github` / `one`; theme-recipes name |
| L2 | low | dual | WebNext* symbols / folder | Rename residue only |
| L3 | low | color | SwiftUI traffic lights, glass tints | Recipe dialect — keep unless tokenized intentionally |
| OK1 | ok | registry | themePack + builtin + recipes + validate | Official ids fully registered |
| OK2 | ok | dual-track ban | `src/**` | Zero `wbn-` / `khaos-` / `--wbn-*` |
| OK3 | ok | i18n styles | components | No user copy in inline styles |

---

## Recommended follow-ups (no code in this audit)

1. Replace product-surface hardcodes (H1–H5, H7) with `var(--cardo-*)` or `color-mix` on those vars; unify delete red.
2. Glass settings shell (H6): paint from `--cardo-settings-chrome` (and optional wash using token blues), per `theme-pack-authoring.md`.
3. Introduce a thin z-index ladder (CSS vars or TS const) for shell / overlay / portal bands.
4. Collapse chip size + box Motion radius dialect: either pack tokens (`chrome` / radii) or a single presentation helper keyed by pack metadata — avoid unbounded `themeId ===` growth.
5. Delete or fully retire `theme-recipes.css` re-export; stop writing unused `data-theme`.
6. Point mono inputs at `--cardo-font-mono`; leave error-screen isolated or later share a minimal fatal token subset.
7. Keep colorPresets / themeLookPresets / builtin JSON as concrete hex SoT — do not “token-wash” picker data.

---

## Scan method

| Pattern | Tooling | Result |
| --- | --- | --- |
| `#hex` in styles | ripgrep under `src/web/styles` | ~110 hits; clustered above |
| `rgb/rgba/hsl` | ripgrep | shadows + glass mixes + a few non-token rings |
| `wbn-` / `khaos-` | ripgrep under `src` | 0 |
| `z-index` / `zIndex` | ripgrep under `src/web` | ~47 sites |
| `font-family` / `fontFamily` | ripgrep | token SoT + 2 bypasses + error-screen |
| Official theme ids | `themePack.ts` vs `themes/builtin` vs `styles/themes/index.css` | 5/5 aligned |
| `themeId ===` | ripgrep in components | 5 files |
| `style={{` user text | ripgrep components | layout/color only |
| CSS `content:` text | ripgrep styles | empty pseudos only |

---

## Non-goals / intentionally not flagged as defects

- Hex inside official Theme Pack JSON and default token bootstrap.
- Color picker / look preset tables.
- Platform-faithful recipe samples (SwiftUI window controls).
- Transient Motion spring numbers unless they collide with theme clarity rules (scale on text shells already constrained elsewhere).
- Folder rename `web-next` → product name (separate rename checklist).

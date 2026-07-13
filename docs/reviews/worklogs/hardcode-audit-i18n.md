# Hardcode / i18n audit — web-next messages

Date: 2026-07-13  
Scope: read-only. Source of truth: `src/web-next/i18n/messages.ts`  
Usage scan: `src/web-next/**/*.{ts,tsx}` plus dynamic label maps in `src/core/contracts/featureCatalog.ts`, `src/core/contracts/layoutProfile.ts`, and Desktop title bar (`src/desktop/DesktopTitleBar.tsx`).  
No product code was changed.

## Method

1. Parse `WEB_NEXT_MESSAGES.en` vs `.zh` key sets (string keys only).
2. Grep every message key string under `src/web-next` (and note out-of-tree consumers).
3. Collect all `t('…')` / `t(\`…\`)` call sites and map keys from feature catalog, color-override table, add-view titles, and item-type labels.
4. Flag draft / retired / jargon user copy still present in messages.
5. Cross-check Zen layout retirement (`layoutProfile.ts`, `applyLayoutProfile.ts`, preferences hydrate repair).

Type note: `WebNextMessageKey = keyof (typeof WEB_NEXT_MESSAGES)['en']`. Locale `zh` falls back with `WEB_NEXT_MESSAGES[locale][key] ?? WEB_NEXT_MESSAGES.en[key]`.

## 1. en vs zh key parity

Result: no missing keys on either side.

- en and zh define the same closed set of message keys (order differs; zh front-loads recycle/collection strings).
- Missing-on-en list: (empty)
- Missing-on-zh list: (empty)

Approximate size: ~280 keys per locale (settings block is the bulk).

If a future zh key is omitted, users still see English via the runtime fallback; TypeScript indexing on a partial zh object is the usual early warning when the file is typechecked.

## 2. Keys defined but never referenced

Reference means any of:

- `t('key')` / conditional `t(cond ? 'a' : 'b')` under `src/web-next`
- String constant later passed to `t` (feature catalog label keys, color override map, add-view title keys, item type labels, settings search catalog title/description keys)
- Desktop title bar `t('desktop.*')` (outside `src/web-next`, but real consumer)

Dead keys below appear only in `messages.ts` (definition only). Full list.

### 2.1 Zen / layout leftovers

| Key | en copy | Notes |
| --- | --- | --- |
| `layout.exitZen` | Exit Zen | Zen layout removed; no UI calls this key |
| `settings.layout.classic` | Classic | Listed on `LAYOUT_PROFILES` in core but never `t()`’d; layout is forced classic with no settings switch |
| `settings.layout.classicDescription` | Chrome always visible | Same as above |

### 2.2 History operation labels (unused; undo/redo only use three keys)

| Key |
| --- |
| `history.deleteItem` |
| `history.deleteBox` |
| `history.moveBox` |
| `history.resizeBox` |
| `history.deletePage` |
| `history.moveBoxToPage` |
| `history.arrangeBoxes` |
| `history.collectBox` |
| `history.removeCollectedBox` |

Still used: `history.undo`, `history.redo`, `history.controls`.

### 2.3 Toolbar / search leftovers

| Key | en copy |
| --- | --- |
| `toolbar.toggleLanguage` | Toggle language |
| `toolbar.toggleTheme` | Toggle theme |
| `search.noResults` | No boxes match this search. |
| `search.readOnly` | Read only |

Global search uses `search.noGlobalResults`, `search.itemCount`, `search.kind.*`, `search.web` instead.

### 2.4 Settings: unfinished or retired UI copy (no SettingsPanel `t` path)

These look like planned sections (CSS snippet, theme pack I/O, typography, density, multi-client note, official-look restore, advanced groups) that are not wired into the current settings UI.

| Key |
| --- |
| `settings.interface` |
| `settings.interfaceDescription` |
| `settings.cssSnippet` |
| `settings.cssSnippetDescription` |
| `settings.cssSnippetEnabled` |
| `settings.cssSnippetPlaceholder` |
| `settings.cssSnippetInvalid` |
| `settings.cssSnippetHint` |
| `settings.resetFeaturesDescription` |
| `settings.multiClient` |
| `settings.multiClientDescription` |
| `settings.restoreOfficialLook` |
| `settings.restoreOfficialLookDescription` |
| `settings.advancedTheme` |
| `settings.advancedThemeDescription` |
| `settings.advancedInterface` |
| `settings.advancedInterfaceDescription` |
| `settings.expertCss` |
| `settings.expertCssDescription` |
| `settings.exportTheme` |
| `settings.exportThemeDescription` |
| `settings.importTheme` |
| `settings.importThemeDescription` |
| `settings.importThemeInvalid` |
| `settings.removeImportedTheme` |
| `settings.removeImportedThemeDescription` |
| `settings.themeOptions` |
| `settings.themeOptionsDescription` |
| `settings.optionOn` |
| `settings.optionOff` |
| `settings.resetThemeOptions` |
| `settings.colorOverridesExpand` |
| `settings.colorOverridesCollapse` |
| `settings.typography` |
| `settings.typographyDescription` |
| `settings.fontFamily` |
| `settings.fontFamilyDescription` |
| `settings.fontFamily.default` |
| `settings.fontFamily.systemUi` |
| `settings.fontFamily.serif` |
| `settings.fontScale` |
| `settings.fontScaleDescription` |
| `settings.fontScale.sm` |
| `settings.fontScale.md` |
| `settings.fontScale.lg` |
| `settings.density` |
| `settings.densityDescription` |
| `settings.density.compact` |
| `settings.density.comfortable` |
| `settings.density.spacious` |
| `settings.dualPalette` |

Notes:

- Color disclosure uses `settings.colorOverrides` / `settings.colorOverridesDescription` only (not Expand/Collapse).
- Feature reset row uses `settings.resetFeatures` + `settings.resetFeaturesAction` only (not Description).
- Prefs still store `cssSnippet` / `cssSnippetEnabled` and theme option maps in code; only the message keys for those settings UIs are dead.

### 2.5 Menu / box / page / field leftovers

| Key | en copy | Notes |
| --- | --- | --- |
| `menu.lock` | Lock | Superseded by `menu.lockBox` / `menu.unlockBox` |
| `menu.pinBox` | Pin box | No box pin menu wired |
| `menu.unpinBox` | Unpin box | Same |
| `menu.deleteBox` | Delete Box | UI uses recycle/permanent keys |
| `box.pin` | Pin box position | No references |
| `box.unpin` | Unpin box position | No references |
| `box.deleteQuestion` | Delete this {type}? | UI uses `box.moveToRecycleBinQuestion` / `box.deletePermanentlyQuestion` |
| `page.deleteQuestion` | Delete “{title}” and {count} {boxes}? | UI uses `page.deleteWithRecycleBinQuestion` only |
| `field.folderPath` | Local folder path or NAS path | Local add uses `field.localPath` |
| `field.folderPathError` | Enter a local drive or NAS folder path. | Same |
| `field.select` | Select | No select control uses this |
| `field.clipTitle` | Clip title (optional) | Clipboard add only uses `field.clipText` |

### 2.6 Dead-key count

| Bucket | Count |
| --- | --- |
| Zen / layout | 3 |
| History ops | 9 |
| Toolbar / search | 4 |
| Settings unfinished | 53 |
| Menu / box / page / field | 12 |
| Total dead message keys | 81 |

### 2.7 Used outside `src/web-next` (not dead)

| Key | Consumer |
| --- | --- |
| `desktop.minimize` | `src/desktop/DesktopTitleBar.tsx` |
| `desktop.maximize` | same |
| `desktop.restore` | same |
| `desktop.close` | same |

### 2.8 Dynamic but live (not dead)

| Source | Keys |
| --- | --- |
| `FEATURE_CATALOG` → Settings features | all `settings.feature.*` label/description pairs |
| `COLOR_OVERRIDE_LABEL_KEYS` | `settings.colorOverride.{canvas,panel,surface,text,blue,createBackground,settingsChrome,settingsHover}` |
| `SETTINGS_SEARCH_CATALOG` | various settings title/description keys including `settings.themeDescription` |
| `UniversalAddView` | `itemType.*` |
| `LocalResourceAddView` | `add.fileTitle`, `add.shortcutTitle`, `add.folderTitle` |
| `GlobalSearchPanel` | `search.kind.${result.kind}` for `page` \| `box` \| `item` |

## 3. `t('…')` keys that do not exist in messages

Result: none found for static and known dynamic paths.

- Static `t('…')` arguments are constrained to `WebNextMessageKey`.
- Dynamic templates checked:
  - `search.kind.${result.kind}` — `GlobalSearchResult.kind` is `page` \| `box` \| `item`; matching keys exist.
  - `t(feature.labelKey as WebNextMessageKey)` — catalog strings match defined `settings.feature.*` keys.
  - Color override map and add-view title helpers match defined keys.
- Casts (`as WebNextMessageKey`) can hide future catalog typos; catalog currently aligns.

No full missing-`t`-key list (empty).

## 4. Informal / draft / jargon user copy still in messages

These are still defined (and often still shown) even when product language should be end-user plain copy. Severity is editorial, not build-breaking.

### 4.1 Zen leftover (product removed)

- `layout.exitZen`: Exit Zen / 退出禅模式  
  Zen / floating layout is retired (`layoutProfile.ts`: classic only; `applyLayoutProfile` clears float/zen markers; preferences force-classic repair). Key is dead and copy is obsolete.

### 4.2 WebNext / internal product naming in key or copy

| Key | Issue |
| --- | --- |
| `settings.webNextEdition` | Key name is code-era “WebNext”; value is product “Cardo”. Still shown on About. |
| `settings.tokenThemePack` | en: “Design tokens + Theme Pack”; zh keeps English “Design Token + Theme Pack”. Dev/architecture jargon on About. |
| `settings.themeSystem` | “Theme system” is mild but paired with token jargon above. |

### 4.3 “Chrome” shell wording (not Google Chrome)

User-facing strings use browser-UI “chrome” metaphor; easy to misread as browser brand.

| Key | en copy |
| --- | --- |
| `settings.interfaceDescription` | Chrome and workspace tools |
| `settings.layout.classicDescription` | Chrome always visible |
| `settings.advancedInterface` | Chrome features |
| `settings.advancedInterfaceDescription` | Show or hide shell tools |
| `settings.densityDescription` | Chrome spacing |
| `settings.feature.chrome.*` | Namespace + labels for top/bottom bars (feature ids also use `chrome.*`) |

Recommendation for future copy: prefer “shell”, “window chrome”, or concrete “top bar / bottom bar” without bare “Chrome”.

### 4.4 Runtime / multi-client / build jargon (user-facing or nearly so)

| Key | en copy | Issue |
| --- | --- | --- |
| `settings.feature.chrome.runtimeBannerDescription` | Runtime connection toast | Exposes “Runtime”; zh still says “Runtime 连接提示” |
| `runtime.reconnecting` / `runtime.disconnected` | Reconnecting… / Connection lost… | Acceptable UX; key prefix is internal only |
| `settings.multiClient` / `settings.multiClientDescription` | Shared workspace / Active page and undo are shared across connected clients | Dead UI keys; “clients” is architecture talk |
| `settings.updateDescription` | Check GitHub milestone releases for Desktop | Dev/release process language |
| `settings.updateIdle` | Check GitHub for a newer Desktop build. | “build” + GitHub |
| `settings.updateUnsupported` | Updates require a packaged Desktop install. | OK for power users; still technical |
| `settings.updateInstallChannel.dev` | Development | Internal channel label |
| `settings.operationLogDescription` | Export command history | “command history” is registry jargon |
| `settings.cssSnippetPlaceholder` | `/* optional Cardo CSS */` … | Expert placeholder; UI dead but string is draft-expert |

### 4.5 Naming inconsistency / half-migrated Favorites language

| Key | Issue |
| --- | --- |
| `page.collection` | “Favorites” (product) |
| `box.collectedItems` | “Collected Items” / “收集箱” — older “collection” voice |
| `history.collectBox` / `history.removeCollectedBox` | Favorites-aligned English, but keys say collect; also dead |
| `menu.addToCollection` / `menu.removeFromCollection` | Live; English uses Favorites wording, key still “Collection” |

### 4.6 Roadmap-shaped unused settings copy

Large dead block in §2.4 (CSS snippet, expert CSS, export/import theme, typography, font scale, density, multi-client, restore official look, advanced theme/interface, theme options). Reads as draft settings IA not yet shipped or already removed from UI without pruning messages.

## 5. `layout.exitZen` vs product

Flag: remove or archive.

Evidence Zen is gone from product:

1. `src/core/contracts/layoutProfile.ts` — “Floating / zen modes are retired — no dual-read, no settings switch.” Only `classic`.
2. `src/web-next/shell/layouts/applyLayoutProfile.ts` — forces classic; comment clears leftover floating/zen markers.
3. `src/web-next/app/stores/preferencesStore.ts` — one-way repair if stored profile is not classic.
4. Grep for `layout.exitZen`: only `messages.ts` (en + zh). No component, menu, or shortcut references it.

Action (when product edits are allowed): delete `layout.exitZen` from both locales; optionally delete unused `settings.layout.classic*` messages if layout settings UI will never return.

## 6. Summary table

| Check | Result |
| --- | --- |
| en keys missing from zh | none |
| zh keys missing from en | none |
| Message keys with no reference | 81 (full lists in §2) |
| `t(...)` keys missing from messages | none found |
| Zen leftover | `layout.exitZen` — delete candidate |
| Draft / jargon copy | Chrome/Runtime/WebNext/GitHub-build/token language; large unused settings block |
| Favorites rename drift | collection keys vs Favorites user strings |

## 7. Suggested cleanup order (not executed)

1. Delete `layout.exitZen` and other confirmed dead keys in §2 (safe prune; no UI regression if greps stay green).
2. Either wire or delete unfinished settings messages (§2.4) so messages match shipped Settings IA.
3. Rewrite user-visible jargon (§4): Chrome → shell/bars; Runtime toast → “Connection status”; About edition key rename if desired; soften update/GitHub “build” copy.
4. Align remaining “collection/collected” keys and copy with Favorites product language (keys optional; user strings first).
5. Optional: type `FEATURE_CATALOG` label keys as `WebNextMessageKey` to drop `as WebNextMessageKey` casts.

## 8. Files consulted

- `src/web-next/i18n/messages.ts`
- `src/web-next/i18n/useI18n.ts`
- `src/web-next/components/settings/SettingsPanel.tsx`
- `src/web-next/components/settings/settingsSearchCatalog.ts`
- `src/web-next/components/**` (all `useI18n` / `t(` call sites)
- `src/core/contracts/featureCatalog.ts`
- `src/core/contracts/layoutProfile.ts`
- `src/core/contracts/globalSearch.ts`
- `src/web-next/shell/layouts/applyLayoutProfile.ts`
- `src/web-next/app/stores/preferencesStore.ts`
- `src/desktop/DesktopTitleBar.tsx`

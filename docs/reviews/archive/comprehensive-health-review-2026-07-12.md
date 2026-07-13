# Cardo comprehensive architecture health review

| Field | Value |
| --- | --- |
| Status | Archived review artifact (moved from docs/architecture) |
| Date | 2026-07-12 |
| Scope | Architecture fitness, debt, i18n, UI token hardcoding, product copy, libs, directory, bugs |
| Policy SoT | `AGENTS.md`, `docs/architecture/local-runtime-multi-client.md` |
| Codebase | `src/{runtime,core,client,cli,desktop,extension,native-host,web-next,web-runtime}` |

## Executive summary

Judgment: the multi-client Runtime architecture meets the stated product needs. Cardo Runtime is the sole SQLite authority; Web / Extension / Desktop are symmetric clients over Zod-validated HTTP + stream; Command/Query/History integrity is in place; OPFS dual-writer and Desktop raw SQL IPC are gone.

The codebase is not “degenerated into scattered hacks,” but it carries concentrated debt in four bands:

1. Product UI / theme token ownership (box radius was a concrete regression class; Motion inline styles vs CSS recipes).
2. User-facing product copy and i18n gaps (roadmap language in Settings, Chinese-only tray, system tab titles).
3. Policy-edge shims and type duals (`ensurePreferencesThemeColumns`, hand `DatabaseCommandResult`, dead `WebNext*` theme aliases).
4. Doc drift (`ui-theme-system.md` was stale; refactor checklist still open for finished work; mid-doc dual-DB “现状”).

Recommendation: keep the Runtime spine; clean debt in priority order below. Do not rewrite directories or swap core libraries for novelty.

---

## Architecture fitness vs SoT

### Question: does the architecture still meet needs?

Answer: yes (partial on policy edges).

| Pillar (AGENTS / local-runtime) | Status | Evidence |
| --- | --- | --- |
| Runtime sole SQLite + business writes | Met | `src/runtime/database.ts` `openRuntimeDatabase`; exclusive lock `src/runtime/lock.ts`; discovery `src/runtime/discovery.ts` |
| Clients via Runtime protocol only | Met | `src/client/runtimeClient.ts`; `src/web-next/platform/hostPlatform.ts` fail-closed, no OPFS fallback |
| Command registry + single txn + op log/history | Met | `src/core/application/executeDatabaseCommand.ts`; handlers under `src/core/application/*` |
| Server-derived InvalidationScope | Met | `src/core/application/invalidationScopes.ts`; applied in `src/runtime/httpServer.ts` |
| AppPorts non-DB only | Met | `src/core/ports/AppPorts.ts` (no DatabasePort) |
| No Extension OPFS authority | Met | `src/extension/runtime/discoverRuntime.ts`; NM host never opens SQLite |
| No Desktop business raw SQL IPC | Met | `src/desktop/preload.ts` / `desktopIpc.ts` — window/clipboard/shell only |
| Desktop attach-first embed-if-missing | Met | `src/desktop/ensureDesktopRuntime.ts` (detached Runtime child; no Main-hosted Runtime DB) |
| Zod boundary SoT | Mostly met | `src/core/contracts/*`; residual hand types in `commandTypes.ts` |
| No old-schema dual-read | Mostly met | Forward migrator `src/core/database/migrator.ts`; exception: `ensurePreferencesColumns.ts` |
| Runtime no electron | Met | `src/runtime/*` free of electron imports |
| Zustand only ephemeral UI | Met | UI stores under `src/web-next/app/stores/*`; no full Workspace Snapshot persist |

### Question: fragmented / degraded by ad-hoc work?

Answer: partial. Topology is coherent. Degradation shows as naming leftovers (`web-next` / `WebNext*`), Settings simplified while advanced preference keys remain dead, theme material language split across pack tokens + `theme-recipes.css` + Motion inline styles, and docs lagging code.

Keep: RuntimeClient revision watermarks, CommandQueue, path SoT `cardo` / `cardo.sqlite`, Feature Catalog + Theme Pack contracts.

---

## Fragmentation and dual-track debt

| Item | Severity | Disposition | Evidence |
| --- | --- | --- | --- |
| `WebNext*` theme aliases (`registerWebNextTheme`, `getWebNextTheme`, `WebNextThemePalette`, …) | should-fix | delete dead exports; merge call sites to `applyTheme` / ThemePack | `src/web-next/themes/themeRegistry.ts`; Settings still uses `getRegisteredWebNextThemes` |
| `applyWebNextTheme` wrapper | polish | merge → call `applyTheme` | `WebNextApp.tsx` |
| `src/web-next` product UI name | polish | restructure later → e.g. `src/ui` | Entire tree; build chunk names |
| `settings.webNextEdition` key | polish | rename to product-neutral key | `messages.ts`, About settings |
| Dual-track CSS `--wbn-*` / `ui/khaos` | none left in src | keep clean | Inventory scan: 0 `wbn-` / `khaos-` class uses; 2299 `cardo-` |
| Doc dual-DB “现状” mermaid | should-fix | rewrite §3.1 as historical | `docs/architecture/local-runtime-multi-client.md` |
| Refactor checklist unchecked for done work | should-fix | sync checkboxes | `docs/architecture/zod-drizzle-shadcn-refactor.md` |
| `ensurePreferencesThemeColumns` soft repair | should-fix | delete or time-box + fail-hard | `src/core/database/ensurePreferencesColumns.ts` + migrator call |
| DatabasePort | keep | Runtime→Drizzle adapter only | `src/core/ports/DatabasePort.ts`, `src/runtime/database.ts` |
| Hand-rolled workspaceStore vs Zustand UI stores | polish | optional unify | `workspaceStore.ts` vs `uiStore.ts` |
| Full `WorkspaceProjection` in client store | deferred | fine-grained scopes already partially applied | `applyWorkspaceInvalidationScopes` |

---

## Dead / redundant / non-compliant inventory

### Blocker

None for multi-client authority (no second SQLite writer found).

### Should-fix

1. `ensurePreferencesThemeColumns` — post-version column ADD is soft-compat; AGENTS forbids old-schema compatibility. Prefer fail-hard or one real migration step, then delete shim.
2. `DatabaseCommandResult` hand interface vs `databaseCommandResultSchema` — dual shapes at boundary (`commandTypes.ts` vs `runtimeProtocol.ts`).
3. Dead theme aliases listed above.
4. Architecture docs describing OPFS / Extension Worker / `ui/khaos` / ocean-orchid as current (partially fixed: `ui-theme-system.md` khaos line).
5. SSE reconnect does not re-`hello()` after stream drop (`runtimeClient.ts` + `httpServer.ts` unregister on close) — multi-client correctness.
6. Concurrent GETs not on CommandQueue while mutation txn uses await-per-statement on one `DatabaseSync` — torn-read risk under multi-client.

### Polish

- Orphan i18n keys (history op labels, advanced settings not mounted).
- Migrator header (fixed in this work: no longer claims Extension Worker / CURRENT=4).
- `isOfficialThemePack` unused export.
- electron dep vs electron-builder version skew (`package.json` 42.4.0 vs build 42.3.0).
- `websiteIconRequests` Map never evicts in hostPlatform.

---

## i18n and hardcoding

### Scan set

`messages.ts` + `useI18n`; top-bar; settings; canvas; items; boxes; runtime banner; bottom-toolbar; history-toolbar; global-search; collection; extension `runtimeGuide.ts`; desktop tray; extension `_locales` (via `vite/extension-locales.ts`); theme pack `name`/`description` locales.

### Catalog coverage

- en/zh key counts: 268 / 268; missing-in-zh / missing-in-en: none (parity scan).
- Product UI components generally call `t(...)`.
- Extension guide: separate en/zh map + `navigator.language` (not preferences).
- Extension Chrome store strings: third catalog via build-time locales.
- Welcome seed: fourth dual-locale map in `welcomeSeed.ts`.

### Gaps (user-visible)

| Severity | Item | Path |
| --- | --- | --- |
| should-fix | Desktop tray Chinese-only | `src/desktop/main.ts` tray labels |
| should-fix (fixed) | Recycle Bin tab used EN DB title | was `RecycleBinTab.tsx`; now mirrors Collection with `t('page.recycleBin')` |
| should-fix | Seed page titles EN-only in SQLite | `initializeWorkspaceDatabase.ts` |
| polish (fixed) | Settings language labels hardcoded | now `t('settings.chinese'/'english')` |
| polish | Fragmented catalogs (web-next / guide / chrome locales / welcome) | multiple paths |
| polish | Dead keys (history.* op titles, advanced settings) | `messages.ts` only |

### Product copy / UX messaging (roadmap language)

Class of bug the user called out: Settings copy promised unshipped “extensions later.”

| Key | Was | Problem |
| --- | --- | --- |
| `settings.appearanceDescription` | “更细的定制留给后续扩展” / “Finer controls will live in extensions later.” | Roadmap leak; also false relative to Theme Pack / prefs model already in Runtime |
| `settings.themeDescription` | “Advanced styling belongs in extensions later.” | Same |

Fixed (this work) to describe current controls only:

- appearance: “选择主题与明暗模式。” / “Choose a theme and light or dark mode.”
- theme: “选择一套主题包，切换整个工作区的外观。” / “Pick a theme pack for the whole workspace.”

Policy for future: user-facing strings must not mention “后续扩展 / later / coming soon / 留给…”. Hide unfinished UI; do not apologize for it in copy. Code comments may note deferred surfaces.

Related product inconsistency (open):

- Preferences + catalog already support layout profile, feature flags, CSS snippet, color overrides, theme import — Settings shell intentionally does not mount them (`SettingsPanel` only general/appearance/data/about).
- Catalog keys still exist → false “fully translated advanced UI” surface.
- Disposition: either mount a clear Advanced section with honest current behavior, or stop shipping unused keys as if they were product; never document “extensions later” in UI.

---

## UI theme hardcoding (including box radius)

### Question: hardcoding that breaks theme packs?

Answer: yes — this was a real product bug class.

#### Root cause (box radius)

1. Theme packs define distinct `tokens.radii` (e.g. classic xl=16px, material xl=28px, paper xl=24px, graphite all 0). Applied via `applyTheme` → `--cardo-radius-*` (`src/web-next/themes/applyTheme.ts`, `radiusCssVariableNames` in `themePack.ts`).
2. `theme-recipes.css` further selects a radius step per material language (github → lg, one → md, classic → xl, graphite → 0).
3. Historical bug: Motion `animate.borderRadius` used bare `16px` / always `var(--cardo-radius-xl)`, writing inline styles that override CSS recipes and ignore pack scale differences users expect when switching themes.
4. Secondary: compact layout profile hard-overrides `--cardo-radius-*` in `layouts.css`, which can fight pack radii when layout=compact.

#### Fix landed in this review

- Introduced product variable `--cardo-box-radius` (default `var(--cardo-radius-xl)`) on `.cardo-box` / `.cardo-collection-box`.
- Theme recipes set `--cardo-box-radius` then `border-radius: var(--cardo-box-radius)`.
- `BaseBoxFrame` Motion uses `var(--cardo-box-radius)` (idle) and pill only for drag-over-tab / delete motion.
- Comments document the ownership invariant.

#### Remaining UI hardcode inventory

| Class | Count / notes | Severity | Disposition |
| --- | --- | --- | --- |
| Bare `border-radius: Npx` in product CSS | essentially gone (error-screen self-contained styles still bare; graphite uses 0 via token var) | polish | keep error-screen isolated |
| Token radius uses | ~104 `var(--cardo-radius-*)` | keep | good |
| `font-size: Npx` in CSS | high (dozens) | polish | migrate chrome text to scale tokens when typography UI ships |
| Hard hex outside tokens | shells/boxes/items/settings samples (`#ff3045`, `#60a5fa`, …) | polish | map to `--cardo-red` / accent tokens |
| Hard `z-index` | many | polish | optional z-index token table (doc already desired) |
| Hard padding/gap px on boxes | many | polish | density already scales space tokens; component padding still px |
| Compact layout absolute radius map | `layouts.css` | should-fix | should multiply or scale pack radii, not replace with fixed px |
| Apple glass blur sometimes bare `24px` | `theme-recipes.css` | polish | prefer `--cardo-chrome-blur` |
| Motion ownership of non-radius props | scale/y on box | keep | product animation; document owners |

Judgment: color tokens largely work; geometry (radius/space/type) still mixed token + hard px. Box radius path is the highest-impact fix and is corrected for pack + recipe + Motion co-ownership.

---

## Refactor and directory recommendations

### Keep (do not rewrite)

```
src/runtime     sole process authority
src/core        schema, commands, queries, contracts
src/client      RuntimeClient
src/cli|desktop|extension|native-host  surfaces
```

### Recommended incremental structure (backlog)

```
src/ui/                 # rename from web-next (shared React shell)
src/web-host/           # rename from web-runtime (static entry only)
src/core/domains/bookmark/   # when v0.5 ships
src/core/shell/appPorts.ts   # optional: free “runtime” name from appPorts
```

### When to restructure

- Rename `web-next` when a large UI PR already touches imports (avoid drive-by).
- Add `domains/bookmark` with v0.5 feature work, not as a pure move PR.
- Dependency direction lint (refactor todo §0) still worth adding: forbid `web-next` → drizzle schema; forbid `runtime` → electron.

### Dependency / architecture checks still missing

- No automated layer lint yet (`zod-drizzle-shadcn-refactor.md` §0 unchecked).
- Fine-grained query hooks incomplete; Canvas/TopBar still often sit on full projection.

---

## Third-party opportunities

Default: keep. No novelty swaps.

| Area | Verdict | Why |
| --- | --- | --- |
| RuntimeClient + stream | keep | Protocol-specific watermarks / self-echo / apply mutex |
| node:http Runtime | keep | Loopback steward; Express does not fix DB serialization |
| Canvas drag | keep | World coords + tabs + optimistic preview ≠ dnd-kit fit |
| Motion Reorder for items | keep | Already mature; staging avoids mid-drag Commands |
| Custom i18n maps | keep | Small, typed keys; i18next is packaging cost without measured pain |
| Global search SQL | keep for now | Local SoT; later FTS5 inside Runtime if corpus grows |
| node:sqlite | keep | Prefer DB single-flight mutex over driver swap |
| Add only when measured | deferred | `@tanstack/virtual` for huge lists; `cmdk` when Command Center ships |

---

## Performance (high-frequency / high-overhead)

Judgment: drag/resize correctly avoid Command mid-frame (AGENTS-compliant), but several pointer-rate and keystroke-rate paths were still expensive.

### Egregious (fixed or still open)

| Issue | Freq | Cost | Status |
| --- | --- | --- | --- |
| `updateBoxDragFrame` replaced `boxDragSession` every pointermove → all boxes subscribed to full session re-rendered | every drag move | O(boxes) React trees | Fixed: mutate `latestFrame` in place, return same Zustand root; per-box selectors in `BaseBoxFrame` |
| Global search on every keystroke + full `box_items` scan for counts | every key | HTTP + SQLite multi-query + client task queue | Fixed: 200ms debounce + empty-query short-circuit; still open: placement full scan, no AbortController |
| `BottomToolbar` subscribed to `panX`/`panY` | every pan move | full bottom chrome re-render | Fixed: read camera via `getState()` only on “New box” |
| `CanvasBoundaryFeedback` React-subscribed to pan | every pan move | edge component re-render | Fixed: DOM class toggles via `useCanvasStore.subscribe` |
| Favicon hydrate: resolve → Command → `items`-only change → full `projection` invalidation; unbounded icon Map | page open with many bookmarks | N× network + full projection + history | Partial: LRU cap 200 on `websiteIconRequests`; still open: narrow scopes / don’t full-project on favicon |
| Preference text fields fire Command each keystroke | settings typing | prefs query + local theme pack disk scan | Open: draft-on-blur / debounce |
| Default invalidation often `projection` | many mutations | full workspace re-query + deep `structurallyShare` | Open: items-only / favicon narrow scopes |
| Client `databaseTaskQueue` serializes queries with mutations | concurrent search + commands | head-of-line blocking | Open: concurrent queries with revision fencing |

### Compliant / good patterns (keep)

- Box drag/resize: motion values for position/size; Command only on pointer end.
- `createLatestFrameScheduler` for tab-drop targeting.
- `useStagedOrder` for item reorder (commit once).
- `CanvasWorld` camera via store.subscribe + DOM transform (not React pan).
- Runtime CommandQueue for mutations; queries not forced onto server command queue.

### Performance backlog (priority)

1. Narrow invalidation for single-item metadata (favicon, pin) → `boxItems` not full projection; avoid multi-KB data URLs in history when possible.
2. Search: drop full `box_items` placement scan for counts; optional AbortController; FTS only if corpus grows.
3. Preference editors: local draft, commit on blur; skip theme-pack disk re-scan when only unrelated fields change.
4. Workspace selectors: page→box index; stop `CollectionPage` full `projection` subscription; equality-aware external store.
5. `previewBoxOnPage`: lighter UI overlay instead of full projection emit + page scene swap.
6. Server: serialize all DB I/O or use IMMEDIATE txn fencing (torn-read under multi-client).
7. rAF-coalesce `canvasStore.panBy` if pan remains hot for any remaining subscribers.

---

## Bugs and gaps

| Sev | Bug | Path / repro | Direction |
| --- | --- | --- | --- |
| should-fix | SSE drop unregisters client; client reconnects stream without re-hello | disconnect network during multi-window use → stuck “Reconnecting…” / mutations fail | re-hello + full catch-up on stream failure |
| should-fix | Reads not serialized with mutation txn on one connection | concurrent search + command | Runtime-wide DB executor / queue reads |
| should-fix (mitigated) | Box radius ignored theme packs | switch Graphite/Material vs Classic | `--cardo-box-radius` + Motion var (landed) |
| should-fix | Tray not i18n | open Desktop tray on EN OS | locale-aware tray labels |
| should-fix | Favicon → full projection | open page with many bookmarks without icons | narrow scopes + optional non-history metadata path |
| polish | `session.bye` no client ownership check | token holder can unregister other clientId | match header client id |
| polish | fire-and-forget commands only console.error | failed rename silent | toast / banner |
| polish (mitigated) | global search no debounce | type fast → request storm | debounce landed; AbortController still open |
| polish | compact layout overrides pack radii with fixed px | compact + graphite | scale factors |

---

## Priority backlog

### P0 — correctness + interaction performance

1. SSE re-hello / session restore on stream failure.
2. Serialize all Runtime DB I/O (reads + writes).
3. Keep drag/search pan fixes healthy; finish favicon/search placement scan costs.

### P1 — product polish (UI/theme/i18n/copy)

4. Keep Motion/CSS token ownership audits for chrome (z-index, hard hex, compact layout radii).
5. Desktop tray i18n; system page display titles always from catalog.
6. Product copy policy: no roadmap language in UI; decide Advanced settings ship or hide keys.
7. Remove dead `WebNext*` theme APIs; Settings → ThemePack view model.

### P2 — compliance / docs

7. Resolve `ensurePreferencesThemeColumns` (fail-hard vs versioned repair then delete).
8. Align `DatabaseCommandResult` with Zod.
9. Rewrite stale architecture “现状” / finish refactor checklist truthfulness.
10. Optional rename `web-next` → `ui` when convenient.

### P3 — future domains

11. Bookmark domain tree under `core/domains/bookmark` for v0.5.
12. Layer lint rules.
13. Fine-grained query hooks to shrink full projection subscriptions.

---

## Opportunistic fixes (this work)

| Fix | Files |
| --- | --- |
| Box radius token ownership (`--cardo-box-radius` + Motion + recipes + collection box) | `boxes.css`, `canvas.css`, `theme-recipes.css`, `BaseBoxFrame.tsx` |
| Remove Settings roadmap copy | `messages.ts` en/zh |
| Recycle Bin tab uses catalog title | `RecycleBinTab.tsx` |
| Settings language buttons use catalog | `SettingsPanel.tsx` |
| Migrator header no longer claims Extension Worker / v4-only | `migrator.ts` |
| Doc `ui/khaos` → `ui/cardo` | `ui-theme-system.md` |
| SettingsPanel comment: no roadmap in user copy | `SettingsPanel.tsx` |
| Drag: no React notify on pointer-rate `latestFrame`; per-box ui selectors | `uiStore.ts`, `BaseBoxFrame.tsx` |
| Global search 200ms debounce | `GlobalSearchPanel.tsx` |
| Bottom toolbar no pan subscription | `BottomToolbar.tsx` |
| Canvas edge feedback DOM-only during pan | `WorkspaceCanvas.tsx` |
| Website icon request LRU (max 200) | `hostPlatform.ts` |

Not done (deferred deliberately): tray i18n, SSE re-hello, DB mutex, favicon narrow invalidation, mass dead-key prune, `web-next` rename, ensurePreferences removal.

---

## Answers to OBJECTIVE questions (one-line + evidence)

1. Architecture meets needs? Yes for multi-client Runtime topology (`src/runtime/*`, `hostPlatform.ts`).
2. Fragmented / degraded? Partial — naming + Settings/theme ownership debt, not dual writers.
3. Dead / redundant / non-compliant? Yes inventory above; main policy tension `ensurePreferencesColumns.ts`.
4. Hardcoding / missing i18n? Yes: tray ZH-only; seed EN titles; UI geometry hard px; box radius class fixed.
5. Product copy debt? Yes: roadmap phrases in Settings (fixed); hidden advanced prefs vs dead keys remain.
6. Architecture/directory refactor warranted? Incremental rename/docs only; no big-bang rewrite.
7. Better arrangement? `web-next`→`ui`, grow `core/domains/*` per feature.
8. Replace with third-party? No high-value replacements; keep custom Runtime/canvas/i18n.
9. Performance egregious paths? Yes — drag React thrash, undebounced search, pan chrome re-renders (mitigated); favicon full projection and default projection invalidation remain.

---

## Review method notes

- Parallel explore agents: architecture fitness, dead/dual-track inventory, i18n scan, libs/bugs, performance hot paths.
- Local scans: i18n key parity; inventory symbols; UI bare radius / hex / font-size counts; theme pack radii table.
- Policy mapping: AGENTS + local-runtime Hard Decisions.

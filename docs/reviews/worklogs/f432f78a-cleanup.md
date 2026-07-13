# Worklog: safe cleanup / archive / gate wiring (f432f78a)

Branch: `fix/runtime-hardening-cleanup-docs`

## Goal

Comprehensive cleanup of redundant docs and dead weight without rewriting Runtime protocol wire shapes or active architecture SoT (`local-runtime-multi-client.md`, theme docs, `AGENTS.md`, active `f432f78a-*` reviews).

## Moved / archived

| Path | Action | Reason |
| --- | --- | --- |
| `docs/architecture/comprehensive-health-review.md` | Archived → `docs/reviews/archive/comprehensive-health-review-2026-07-12.md`; left one-line pointer at old path | Review artifact, not architecture SoT |
| `docs/architecture/zod-drizzle-shadcn-refactor.md` | Archived → `docs/reviews/archive/zod-drizzle-shadcn-refactor.md`; left one-line pointer at old path | Finished migration checklist with heavy checkbox drift; README / local-runtime links keep working via pointer |

## Kept (explicit non-targets)

| Path | Reason |
| --- | --- |
| `docs/architecture/local-runtime-multi-client.md` | SoT; docs agent rewrites in place |
| `docs/architecture/theme-pack-authoring.md` | Active authoring SoT |
| `docs/architecture/ui-theme-system.md` | Active theme SoT |
| `docs/architecture/cardo-rename-checklist.md` | Naming decisions; linked from AGENTS |
| `AGENTS.md` | Contributor constraints SoT |
| `docs/reviews/f432f78a-*.md` | Active review set |
| Runtime protocol wire shapes (`pageTabsAndState`, etc.) | Breaking to remove from wire; not emitted by `deriveInvalidationScopes` but client still handles it |

## Code cleanup

### installChannel dual-test fixed

- Added pure helpers module: `src/desktop/update/installChannelHeuristics.ts` (`isTypicalInstallDirectory`, `isDirectoryWritable`) — no electron import.
- `installChannel.ts` is thin electron wrapper around those helpers; re-exports pure helpers for convenience.
- `installChannel.test.ts` imports from `installChannelHeuristics` (no dual reimplementation, no electron load).

### Dead theme aliases removed

From `src/web-next/themes/themeRegistry.ts` (zero external references):

- `WebNextThemePalette`
- `registerWebNextTheme`
- `getWebNextTheme`
- `hasRegisteredWebNextTheme`
- `isOfficialThemePack`

Kept (still used): `WebNextThemeDefinition`, `getRegisteredWebNextThemes`, `applyWebNextTheme`, ThemePack path APIs.

### Empty / orphan candidates (verify + git rm if desired)

| Path | Status | Notes |
| --- | --- | --- |
| `src/core/database/ensurePreferencesColumns.ts` | Empty stub left by schema-zod slice | Zero imports; soft-repair already removed from migrator. Prefer `git rm` this path if still present. |
| `src/extension/bootstrap/newtab.tsx` | Orphan re-export | HTML entries load `extensionApp.tsx` directly; file not in vite input graph. Marked deprecated; safe `git rm`. |
| `scripts/strip-retired-settings-themes.py` | One-shot, unreferenced | Retired windows/github theme CSS already gone from `settings.css`. Safe `git rm` after confirm. |

No empty stub directories found under `src/`.

## pageTabsAndState (document only)

- Protocol: `runtimeProtocol.ts` includes `{ type: 'pageTabsAndState' }`.
- Client: `workspaceStore.ts` handles the scope (pageTabs + workspaceState).
- Server derive: `invalidationScopes.ts` never emits `pageTabsAndState` (page.create + state multi-table falls through to `projection`).
- Decision this slice: leave wire protocol unchanged (breaking otherwise). Emit or drop is a later protocol revision.

## package.json scripts

- Added `"validate:themes": "tsx scripts/validate-builtin-themes.ts"`.
- Extended `"check"`: `lint && lint:eslint && test:ts && validate:themes`.

## ESLint

- Added `src/web-next/**` rule `no-restricted-imports` forbidding:
  - `drizzle-orm`
  - patterns `**/database/schema`, `**/database/schema.*`, `**/core/database/schema`
- Rationale: AGENTS UI boundary; web-next currently has zero such imports (verified by grep).

## Intentionally not done

- Full architecture SoT rewrite (`local-runtime-multi-client.md`) — other agent.
- Rename entire `web-next` tree / remaining `WebNext*` product names — not dead code; drive-by rename banned.
- Remove `pageTabsAndState` from protocol wire.
- Mass i18n dead-key prune.
- Delete `cardo-rename-checklist.md` (still policy reference).

## Coordination notes

- schema-zod worklog already removed soft-repair call sites; this slice only notes the empty `ensurePreferencesColumns.ts` stub for `git rm`.
- Docs agent rewrote `local-runtime-multi-client.md` and added overview/robustness; architecture `README.md` index updated here so archive links are accurate.
- No Runtime wire protocol field removals.

## Verification

- Grep: no remaining dual `isTypicalInstallDirectory` body in test file.
- Grep: removed theme aliases have no external call sites.
- Grep: `src/web-next` has no `drizzle-orm` / `database/schema` imports.
- Per AGENTS: did not run tests; user may run `npm run check` / `npm run build:all` on this branch before merge.

## Manual follow-up (no delete_file in this agent toolset)

If still present as empty/orphan paths, run:

```text
git rm -f src/core/database/ensurePreferencesColumns.ts
git rm -f src/extension/bootstrap/newtab.tsx
git rm -f scripts/strip-retired-settings-themes.py
```

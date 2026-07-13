# Tests and code quality (30788051)

| Field | Value |
| --- | --- |
| Review id | 30788051 |
| Date | 2026-07-13 |
| Scope | `src/**/*.test.ts`, package check scripts, `.github/workflows/*`, type safety, dead duals, UI policy enforcement, AGENTS CI gates, `validate:themes`, eslint restricted imports |
| Policy SoT | `AGENTS.md` |
| Method | Full inventory of 11 test files; `package.json` scripts; `ci.yml` / `release.yml`; greps for ensurePreferences / dual types / WebNext / `as any` / drizzle in UI / installChannel; eslint.config.js; sample of Runtime/command/history/hotspot modules |
| Relation | Re-baseline after f432f78a cleanup worklogs (schema-zod, update heuristics, themes gate, restricted imports) |

## Executive judgment

Static quality tooling for Cardo is now aligned with the documented merge gate on PR/main CI: format:check → `npm run check` (tsc + ESLint type-checked + node:test + validate:themes) → `build:all`. Several earlier dual-track and policy-shim findings are closed: `ensurePreferences*` soft ADD COLUMN is gone; `DatabaseCommandResult` is `z.infer` from the Runtime protocol; install-channel path heuristics live in a pure module and are imported by tests; web-next is ESLint-blocked from drizzle/schema; `validate:themes` is part of `check` and therefore CI.

Behavioral regression coverage remains thin. Still only eleven `src/**/*.test.ts` files (no `*.test.tsx`), almost all pure-function or tiny store units. Zero automated tests under `src/runtime/`, `src/core/application/*` (handlers, history, execute, scopes), `src/core/database/migrator.ts`, or `src/client/runtimeClient.ts`. ~48 WorkspaceCommand types and the HTTP/SSE spine can regress without failing CI. Release still runs format:check then packages Desktop without `npm run check` or install smoke. Residual dual: hand `DesktopInstallChannel` in `installChannel.ts` beside Zod `desktopInstallChannelSchema`. WebNext* naming residue is still widespread but presentation-only.

Net: compile/type/theme gates are real and improved vs f432f78a; multi-client Runtime authority path is still largely untested. Highest leverage remains in-process migrator + command golden + history + invalidation scopes, then Release `check`, then pure GitHub asset-pick / SHA256SUMS tests.

## Test inventory table

Runner: `npm run test:ts` → `tsx --test "src/**/*.test.ts"` (Node built-in test runner). Invoked via `npm run check` and `npm run test`. No coverage reporter or threshold.

| File | Domain | Cases (approx) | Quality | Gaps |
| --- | --- | --- | --- | --- |
| `src/core/version/semver.test.ts` | Product X.Y.Z parse/compare for updater | 3 describes | good | No link to GitHub tag_name edge cases beyond normalize |
| `src/core/domains/items/services/isUrlText.test.ts` | Paste URL detect | 5 | good | No IPv6, userinfo, unicode IDN |
| `src/web-next/domain/canvasGeometry.test.ts` | World bounds, pan clamp, client→world, resize constrain | 6 | good | Zoom ≠ 1 untested if product adds zoom |
| `src/web-next/domain/placement.test.ts` | Cross-page landing + avoidOverlap | 3 | good | Drop controller / camera grab not covered |
| `src/web-next/domain/paste.test.ts` | Paste draft folder/url/clipboard/file/shortcut | 5 | good | No UNC, file://, multi-line |
| `src/web-next/app/stores/canvasStore.test.ts` | Per-page camera isolation + viewport reclamp | 2 | good | Interaction modes / pan lock under load untested |
| `src/web-next/app/stores/independentMenuStore.test.ts` | Menu position clamp pure helper | 2 | thin | open/close/drag of menus untested |
| `src/native-host/messageCodec.test.ts` | Length-prefixed NM codec | 2 | good | One partial-frame case; no multi-message stream / max size |
| `src/native-host/handleNativeHostRequest.test.ts` | Unsupported type + path validation + file URL normalize | 3 | good | No discover/open success with mocked FS |
| `src/extension/ports/createExtensionPorts.test.ts` | AppPorts shell shape, no database | 1 | smoke | Does not invoke ports; no NM boundary Zod |
| `src/desktop/update/installChannel.test.ts` | `isTypicalInstallDirectory` via pure heuristics | 2 | good (improved) | No Program Files / writable / portable env branches of `detectInstallChannel` (electron-bound); no asset pick / SHA256SUMS |

Total: 11 files. No `*.test.tsx`. No integration or e2e harness. No tests for Runtime HTTP, Command registry, History, Migrator, RuntimeClient, Desktop updater apply path, CLI, or theme script (theme validation is a separate CI script, not a unit test).

## Coverage heatmap

| Domain | Tested? | Risk if untested |
| --- | --- | --- |
| Runtime HTTP (`src/runtime/httpServer.ts`, ~800+ LOC: routes, CORS, body limit, static /app) | no | Auth/CORS/command/query/history/export/SSE regressions ship; wrong multi-client fan-out |
| Command registry + handlers (~48 command types in `workspaceCommands` / `databaseCommandRegistry`) | no | Data corruption, incomplete history change sets, wrong undo |
| `executeDatabaseCommand` (txn + op log + history + revision) | no | Mutating path without log/revision; silent non-mutate |
| History undo/redo (`historyEngine.ts`) | no | User-visible undo breakage; revision double-apply |
| InvalidationScope (`invalidationScopes.ts` pure) | no | Under/over refresh; multi-client UI desync — high ROI pure unit |
| Migrator (`migrator.ts` 0→3→…→9; v1/v2 fail hard) | no | Startup fail or incomplete schema on upgrade |
| `ensurePreferences*` soft repair | removed | Was policy violation; gone from `src/core/database/` |
| RuntimeClient (`client/runtimeClient.ts`, ~820 LOC) | no | Revision watermark, SSE apply, reconnect-without-hello |
| Auth / lock / discovery (`runtime/auth.ts`, `lock.ts`, `discovery.ts`) | no | Second Runtime starts; token/session bugs |
| Extension NM discovery | no | Fail-closed wrong or accepts bad payloads |
| Native host full request matrix | partial | Discover/open success untested |
| Desktop updater (`desktopUpdater.ts`, `githubReleaseClient.ts`) | no (semver + thin install dir only) | Wrong asset, draft/prerelease consume, portable↔setup migrate, checksum miss |
| Theme pack validation | script in `check`/CI | Gate present; not unit-tested internals of opacity heuristic |
| Workspace queries / global search | no | Projection shape drift vs UI |
| CLI serve/stop/status | no | Process management regressions |
| UI canvas geometry / paste / placement | yes (pure) | Relative strength of the suite |
| UI drag/resize commit discipline | review only | Policy relies on code review |
| Desktop package smoke | no | Broken installer found after Release publish |
| Typecheck / ESLint / format / themes | yes on PR CI | Strong for static quality |

## Findings

### F1 — Severity: high

Title: Core Runtime authority path has no automated tests

Evidence: All eleven `*.test.ts` files sit under version helpers, web-next domain/stores, native-host codec/path, extension ports smoke, and install heuristics. None under `src/runtime/`, `src/core/application/` (except types re-export), `src/core/database/migrator.ts`, or `src/client/`. Registry freezes ~48 handlers (`databaseCommandRegistry.ts`); `executeDatabaseCommand` always writes operation_log + optional history + revision bump on mutate (`executeDatabaseCommand.ts`). History undo/redo and HTTP surface untested.

Why it matters: Product authority is Runtime SQLite + Command txn. A handler that omits history rows, fails to bump revision, or returns wrong scopes will not fail CI.

Suggested fix: In-process fixture (Node SQLite / Runtime open path): migrator empty→9; golden commands `page.create`, `box.create`, `item.create`, `box.updateFrame`, `preferences.setTheme`; assert rows + changes + revision; undo/redo one create; table-driven `deriveInvalidationScopes`.

### F2 — Severity: high

Title: PR CI proves compile and pure units, not multi-client protocol behavior

Evidence: `.github/workflows/ci.yml` (windows-latest, Node 22): format:check → `npm run check` → `build:all`. `check` = lint (tsc) + lint:eslint + test:ts + validate:themes. Valuable; does not start Runtime, does not hello/command/query round-trip, does not package Desktop.

Why it matters: Green CI means “types, lint, pure helpers, themes, surfaces build,” not “clients can talk to Runtime.”

Suggested fix: Short smoke after check (or inside check as a script): ephemeral dataDir/port → bootstrap/hello → one command → query.projection → stop.

### F3 — Severity: medium

Title: Release workflow skips `npm run check` and has no package smoke

Evidence: `.github/workflows/release.yml`: format:check → version/tag → `release:build` → assert Setup/Portable paths exist → SHA256SUMS → GitHub Release. No `npm run check`, no unit tests, no launch of portable/setup, no asar content verify beyond outer exe presence.

Why it matters: workflow_dispatch or tag on a tip that skipped PR CI can ship without tsc/eslint/themes/tests. Packaging can succeed while Main fails at runtime (preload, missing web-runtime).

Suggested fix: Run `npm run check` before `release:build`. Optionally verify expected files under win-unpacked / asar (main.js, web-runtime index). Launch smoke later if a `--smoke` flag exists.

### F4 — Severity: medium (improved from prior high/medium)

Title: Theme validation is gated on PR CI; Release still omits it

Evidence: `package.json`: `"validate:themes": "tsx scripts/validate-builtin-themes.ts"` and `"check": "… && npm run validate:themes"`. CI step “Run static checks and tests” runs full check. Release does not run check. Script validates OFFICIAL ids, dual palettes, opaque settingsChrome/settingsHover, recipe entries, chrome.material (`scripts/validate-builtin-themes.ts`).

Why it matters: Official theme drift is blocked on PR/main; a release built without that path can still skip it.

Suggested fix: Keep themes in check; add check to Release (same as F3).

### F5 — Severity: closed (verify only)

Title: `ensurePreferences*` soft-compat is gone

Evidence: `src/core/database/` listing has no `ensurePreferencesColumns.ts`. Grep for `ensurePreferences` hits only historical review/worklog docs, not product TS. Migrator is pure forward 0→3 then 4…9 with fail-hard on 1/2 and future (`migrator.ts`).

Why it matters: Prior AGENTS violation removed; do not reintroduce post-version ADD COLUMN shims.

Suggested fix: Add migrator tests so future “helpful” soft repair is harder to land unnoticed.

### F6 — Severity: closed for DatabaseCommandResult; residual dual remains for install channel type

Title: Dual types — protocol result fixed; DesktopInstallChannel still hand-declared

Evidence:

- Fixed: `commandTypes.ts` re-exports `DatabaseCommandResult` from `runtimeProtocol` (`z.infer<typeof databaseCommandResultSchema>`). Call sites use re-export or contracts.
- Residual: `src/desktop/update/installChannel.ts` defines `export type DesktopInstallChannel = 'setup' | 'portable' | 'dev'` and `DesktopInstallChannelInfo` by hand, while `src/core/contracts/desktopUpdate.ts` has `desktopInstallChannelSchema` and `z.infer` of the same union. `githubReleaseClient` imports the Zod-derived type; installChannel module uses the hand type.
- Contracts overall lean on `z.infer` (runtimeProtocol, preferences, themePack, history). Hand interfaces remain where appropriate for non-boundary catalogs (e.g. FeatureDefinition, layout profile defs).

Why it matters: Install channel dual can drift if one side adds a value; updater asset pick depends on channel identity.

Suggested fix: `export type DesktopInstallChannel = z.infer<typeof desktopInstallChannelSchema>` from contracts; installChannel imports it. Keep pure path helpers separate (already done).

### F7 — Severity: low (was medium; largely fixed)

Title: installChannel tests now import production heuristics; coverage still narrow

Evidence: `installChannel.test.ts` imports `isTypicalInstallDirectory` from `installChannelHeuristics.ts` (no electron). Two cases: LocalAppData Programs true; Downloads false. Production also has `isDirectoryWritable`, portable env (`PORTABLE_EXECUTABLE_*`), and packaged fallback in `detectInstallChannel` (electron `app.isPackaged`) — untested. `pickSetupAsset` / `pickPortableAsset` / `parseSha256Sums` in `githubReleaseClient.ts` are non-exported and untested.

Why it matters: Dual-test drift fixed; updater safety still unenforced by CI.

Suggested fix: Export pure pick/parse helpers (or move to a pure module); fixture JSON for draft/prerelease skip, Setup vs Portable no-fallback, SHA256SUMS line parse. Optional pure tests for portable env path construction without electron by extracting packaged branch inputs.

### F8 — Severity: low (partially fixed)

Title: ESLint restricted imports cover web-next only

Evidence: `eslint.config.js` `no-restricted-imports` for `src/web-next/**/*`: forbids `drizzle-orm` and `**/database/schema`. Grep: no drizzle/schema under web-next. No equivalent blocks for `src/extension/**`, Desktop renderer surfaces, or “no electron in `src/runtime/**` / `src/core/**`” (core/runtime currently clean of electron imports by grep). No ban on `database:execute` IPC (also absent in tree).

Why it matters: Accidental UI→schema or Runtime→electron import fails CI only for web-next path.

Suggested fix: Mirror restricted imports for extension client UI entrypoints if any; forbid electron under `src/runtime/**` and `src/core/**`; optional IPC channel allowlist test for desktop preload.

### F9 — Severity: low

Title: Drag/resize commit discipline looks compliant; not automated

Evidence: `BaseBoxFrame.tsx` resize calls `updateBoxFrame` in pointer `onEnd` (~L283–284). Drag preview is local; cross-page commit is drop-path (prior review; still no mid-drag fireCommand in BaseBoxFrame grep). Zustand canvas/ui/menu stores are ephemeral; workspace/preferences hold Runtime projection in memory. sessionStorage used only for Runtime token exchange on hosted pages (`hostPlatform.ts`), not full Workspace Snapshot.

Why it matters: Correct today; a future mid-drag Command would not fail CI.

Suggested fix: Prefer review checklist + later integration; avoid brittle eslint ban on fireCommand inside drag modules.

### F10 — Severity: low

Title: Complexity hotspots without tests

Approximate sizes sampled:

| Module | ~LOC | Role |
| --- | --- | --- |
| `src/web-next/components/settings/SettingsPanel.tsx` | ~1130 | Settings UI |
| `src/client/runtimeClient.ts` | ~820 | Shared client protocol |
| `src/runtime/httpServer.ts` | ~800+ | All Runtime HTTP |
| `src/web-next/components/boxes/BaseBoxFrame.tsx` | ~800 | Box chrome, drag, resize |
| `src/web-next/i18n/messages.ts` | ~650 | Copy dictionary |
| `src/core/application/itemCommandHandlers.ts` | ~570 | Item commands |
| `src/web-next/app/stores/preferencesStore.ts` | ~520+ | Preferences client store |

Why it matters: High change frequency + no tests = high regression cost on RuntimeClient and httpServer especially.

Suggested fix: Extract pure revision/SSE/CORS helpers and unit-test them before large splits.

### F11 — Severity: low

Title: WebNext* naming residue (not a dual UI runtime)

Evidence: Widespread: `startWebNextApp`, `WebNextApp`, `applyWebNextTheme`, `WebNextLocale`, `translateWebNext`, `getRegisteredWebNextThemes`, directory `src/web-next/`. `WebNextColorMode` is a type alias of contract `ColorMode` (`themeRegistry.ts`). Product user-facing brand is Cardo; AGENTS forbids WebNext/Khaos leakage in user copy. No second product UI implementation found.

Why it matters: Import confusion and review noise; not dual-write.

Suggested fix: Incremental rename on touch; not a test-suite blocker.

### F12 — Severity: low

Title: Type escape hatches rare and at boundaries

Evidence: Grep in `src`: no `as any`, no `@ts-expect-error` / `@ts-ignore`. `as unknown as` only in `runtimeClient.ts` (queryData payload) and `runtime/database.ts` (sqlite rows → execute response rows).

Why it matters: Acceptable at I/O edges; prefer Zod discriminated returns for query types.

Suggested fix: Narrow query results via parsed.type map instead of cast.

### F13 — Severity: low

Title: createExtensionPorts test remains smoke-only

Evidence: Asserts `'database' in ports === false` and truthiness of method refs; no invoke, no schema round-trip.

Why it matters: False confidence on Extension shell contract.

Suggested fix: Keep no-database assertion; deepen NM/discover schema tests (native-host partial).

## CI gaps

| Gap | PR/main CI today | Release today | Recommendation |
| --- | --- | --- | --- |
| format:check | yes | yes | keep |
| tsc (`lint`) | yes via check | no | add check to Release |
| ESLint type-checked | yes via check | no | add check to Release |
| Unit tests (`test:ts`) | yes via check | no | add check to Release |
| validate:themes | yes via check | no | covered if Release runs check |
| Full product build | yes `build:all` | via `release:build` | keep |
| Runtime HTTP smoke | no | no | add small step/script |
| Desktop installer/portable launch smoke | no | no | Release-only later |
| Artifact existence (Setup/Portable) | n/a | yes | keep; extend to asar internals |
| Coverage report / threshold | no | no | optional later |
| OS matrix | windows-latest only | windows-latest | OK Desktop-first v1 |
| CI build artifacts retention | none | Release 30d | optional |

Scripts reference (`package.json`):

- `lint` = `tsc --noEmit` (name is typecheck, not ESLint)
- `lint:eslint` = type-checked ESLint
- `check` = lint + lint:eslint + test:ts + validate:themes (matches AGENTS CI table)
- `test` / `test:ts` = tsx node:test glob
- `format` / `format:check` = Prettier on src, scripts, README, vite, eslint.config.js
- No `test:coverage`
- Local merge gate also requires `build:all` separately (documented in AGENTS; AI default skips unit tests locally but CI runs them)

## Policy enforcement gaps

| AGENTS policy | Enforced by? | Gap |
| --- | --- | --- |
| Runtime sole SQLite writer; clients via protocol | Architecture + structure | No test that Extension/Desktop never open business sqlite |
| Writes only via Command Registry + single txn + op log/history | `executeDatabaseCommand` implementation | No tests that every undoable mutate writes log/history + revision |
| Zod boundary SoT; no hand business interfaces | Mostly; residual hand DesktopInstallChannel | No lint forbidding parallel channel unions |
| No Drizzle / schema in UI | eslint restricted-imports on web-next | Extension/other clients not covered by same rule |
| No Desktop business raw SQL IPC | Code structure; no `database:execute` found | No IPC allowlist test |
| No Extension OPFS authority | design + client path | No automated test |
| Zustand only ephemeral UI; no full Workspace Snapshot persist | store design | No lint against zustand persist middleware |
| No Command/DB write during drag/resize frames | implementation review | No automated test |
| No old schema / retired field compatibility | migrator fail-hard; ensurePreferences deleted | No migrator regression suite |
| Official theme registration + validate | `validate:themes` in check/CI | Missing on Release unless check added |
| Trunk-based branching; no silent release tags | process (AGENTS) | Branch protection external; not verified here |
| Runtime core no electron | currently true by import grep | No eslint forbid electron under runtime/core |
| Product copy no WebNext/Khaos | process + i18n discipline | Naming residue in APIs remains |

## Recommended test plan

Priority order for next ~2 weeks (highest ROI first).

Week 1 — Runtime authority

1. Migrator fixture: empty DB → version 9; assert required tables/columns; reject v1/v2 and future. File: `src/core/database/migrator.test.ts`.
2. Command golden path (in-process DB, no HTTP): page.create, box.create, item.create (bookmark), box.updateFrame, preferences.setTheme; assert rows + non-empty changes + revision++. File: `src/core/application/executeDatabaseCommand.test.ts`.
3. History: undo then redo one create; state restore + revision monotonic. File: `src/core/application/historyEngine.test.ts`.
4. InvalidationScope table-driven: preferences-only, app_state navigation, pages meta, single box_items, multi-table → projection. File: `src/core/application/invalidationScopes.test.ts` (pure, cheapest).
5. Confirm Release workflow gains `npm run check` before `release:build`.

Week 2 — Protocol + updater edges

6. Runtime HTTP smoke script: ephemeral dataDir/port → auth bootstrap/hello → command → query → stop; optional one SSE mutation event.
7. RuntimeClient pure helpers: revision watermark (self-echo vs remote), error mapping; mock fetch for command.ok schema failures.
8. Export pure GitHub asset pick + SHA256SUMS parse; fixture tests (draft/prerelease null; portable never Setup; checksum required fail-closed).
9. Broaden installChannelHeuristics tests (Program Files, nested Programs path); keep electron out of unit path.
10. Collapse DesktopInstallChannel to contracts Zod type; extend eslint restricted-imports to runtime/core electron ban if desired.

Defer unless regression hits

- Playwright / extension e2e
- Full Desktop auto-update download (network)
- Coverage thresholds
- Split SettingsPanel / BaseBoxFrame without behavior change
- Mass WebNext* rename

## Appendix A — Grep / tree snapshot (review date)

| Pattern | Result |
| --- | --- |
| `src/**/*.test.ts` count | 11 files |
| `as any` in src | none |
| `@ts-expect-error` / `@ts-ignore` in src | none |
| `as unknown as` | `client/runtimeClient.ts`, `runtime/database.ts` |
| drizzle/schema under web-next | none |
| `database:execute` | none |
| `ensurePreferences` in product TS | none (docs only) |
| electron import under `src/runtime` / `src/core` | none |
| WebNext* / web-next | widespread naming/directory; single UI product path |
| Hand `DesktopInstallChannel` dual | `installChannel.ts` vs `desktopUpdate.ts` Zod |

## Appendix B — Workflows and scripts

- PR/main: `.github/workflows/ci.yml` — format:check → check → build:all (windows-latest, Node 22, concurrency cancel-in-progress)
- Milestone: `.github/workflows/release.yml` — format:check → resolve X.Y.Z → release:build → assets + GitHub Release (contents: write); does not re-run check
- AGENTS local merge order: format → format:check → lint → lint:eslint → validate:themes → build:all (test:ts via CI check; AI default skips local unit tests unless CI red)

## Appendix C — UI architecture compliance (spot check)

| Rule | Spot-check result |
| --- | --- |
| No Command mid-drag | Resize commits on pointer end; no fireCommand in BaseBoxFrame drag frame path |
| Zustand ephemeral | ui/canvas/independentMenu; no Workspace Snapshot localStorage |
| No Drizzle in UI | clean + eslint on web-next |
| Workspace writes via Runtime commands | stores → RuntimeClient / fireCommand pattern |
| Theme tokens / validate | official packs validated in check |
| Dual UI prefix (wbn-/khaos-) | not surveyed exhaustively this pass; product CSS policy remains review/CI theme path |

## Appendix D — Delta vs f432f78a tests-quality

| Prior finding | Status in 30788051 |
| --- | --- |
| Theme validate not in check/CI | Fixed (in check; still missing on Release alone) |
| ensurePreferences soft repair | Fixed (deleted) |
| Hand DatabaseCommandResult dual | Fixed (z.infer re-export) |
| installChannel test copy-paste dual | Fixed (imports heuristics); coverage still thin |
| No eslint restricted-imports for UI drizzle | Fixed for web-next only |
| Runtime spine untested | Still open |
| Release skips check / smoke | Still open |
| WebNext naming | Still open (low) |
| God files untested | Still open |

End of review 30788051.

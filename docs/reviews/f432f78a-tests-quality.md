# Tests and code quality review (f432f78a)

| Field | Value |
| --- | --- |
| Review id | f432f78a |
| Date | 2026-07-13 |
| Scope | `src/**/*.test.ts`, package scripts, `.github/workflows/*`, type/safety smells, `src/web-next` architecture compliance |
| Policy SoT | `AGENTS.md` |
| Method | Full test-file inventory; workflow + package.json scripts; greps for drizzle/schema/`as any`/`@ts-expect-error`/WebNext/ensurePreferences; sample of largest modules |

## Executive judgment

Cardo’s production architecture (Runtime sole SQLite authority, Zod protocol, Command txn + history) is coherent, and static quality tooling is relatively strong: `tsc --noEmit`, type-checked ESLint, Prettier, and a full `build:all` on every PR/main CI run. Type-safety greps are clean on the usual red flags (`as any`, `@ts-expect-error` not found in `src`).

The automated test suite is not. There are eleven `src/**/*.test.ts` files, almost all pure-function or tiny store unit tests. Zero coverage of Runtime HTTP, Command registry/handlers, History undo/redo, RuntimeClient revision/SSE, migrator, Extension discovery, theme validation (script exists but is not wired into `check`/CI), auth, lock/discovery, or Desktop updater beyond a duplicated heuristic. CI never packages Desktop and never runs a smoke install; Release does not re-run `npm run check`. Most AGENTS policies (no Command mid-drag, no Drizzle in UI, no old-schema compat, theme registration, trunk workflow) are convention-only.

Net: build/type gate is real; behavioral regression gate for the multi-client Runtime spine is mostly missing. Highest leverage is a small in-process Runtime fixture + Command/History/InvalidationScope/Migrator tests, then wiring `validate-builtin-themes` into `check`, then Desktop package smoke on Release.

## Test inventory

Runner: `npm run test:ts` → `tsx --test "src/**/*.test.ts"` (Node built-in test runner). Also invoked via `npm run check` and `npm run test`.

| File | Domain | Quality | Gaps |
| --- | --- | --- | --- |
| `src/core/version/semver.test.ts` | Product semver / updater version compare | good | No interaction with `releaseChannel` / GitHub tag parsing |
| `src/core/domains/items/services/isUrlText.test.ts` | Paste URL detect | good | No unicode / IPv6 / auth-in-URL cases |
| `src/web-next/domain/canvasGeometry.test.ts` | Canvas world bounds, pan clamp, client→world, resize constrain | good | Zoom ≠ 1 paths not covered if product adds zoom |
| `src/web-next/domain/placement.test.ts` | Cross-page landing frame + avoidOverlap | good | Full `BoxPageDropController` / camera-invariant grab not covered |
| `src/web-next/domain/paste.test.ts` | Paste draft typing (folder/url/clipboard/file/shortcut) | good | No Windows UNC, file:// URLs, or multi-line paste |
| `src/web-next/app/stores/canvasStore.test.ts` | Per-page camera isolation + viewport reclamp | good | No pan/lock interaction modes, no animation flags under UI load |
| `src/web-next/app/stores/independentMenuStore.test.ts` | Menu position clamp | good / thin | Only clamp pure helper; open/close/drag of menus untested |
| `src/native-host/messageCodec.test.ts` | Length-prefixed native messaging codec | good | Partial frames only one case; no multi-message stream / max size |
| `src/native-host/handleNativeHostRequest.test.ts` | Unsupported request + path validation + file URL normalize | good | Does not exercise `runtime.discover` / open success path with mocked FS |
| `src/extension/ports/createExtensionPorts.test.ts` | Extension AppPorts shape (no database) | smoke | Does not call ports; does not assert against `AppPorts` type contract beyond `'database' in ports` |
| `src/desktop/update/installChannel.test.ts` | Install channel directory heuristics | thin / dual | Reimplements `isTypicalInstallDirectory` in the test file instead of importing production code (electron `app` blocks import). Drift risk with `installChannel.ts` |

Total: 11 files. No `*.test.tsx`. No integration/e2e harness.

## Coverage heatmap

| Domain | Tested? | Risk if untested |
| --- | --- | --- |
| Runtime HTTP (`src/runtime/httpServer.ts`, ~740 lines) | no | Auth/CORS/command/query/history/export/SSE regressions ship silently; multi-client fan-out wrong scopes |
| Command registry + handlers (`src/core/application/*CommandHandlers.ts`, ~40 command types) | no | Data corruption, incomplete history change sets, wrong undo |
| History undo/redo (`historyEngine.ts`) | no | User-visible undo breakage; revision not bumped / double-apply |
| InvalidationScope derivation (`invalidationScopes.ts`) | no | Under/over refresh; multi-client UI desync |
| Migrator (`migrator.ts` + drizzle SQL steps 0→9) | no | Startup fail or silent incomplete schema on upgrade |
| `ensurePreferencesThemeColumns` soft repair | no | Policy-violating path never characterized; can mask broken migrations |
| RuntimeClient (`client/runtimeClient.ts`, ~760 lines) | no | Revision watermark, self-echo vs SSE apply, reconnect-without-hello |
| Auth / lock / discovery (`runtime/auth.ts`, `lock.ts`, `discovery.ts`) | no | Second Runtime starts, token leaks, stale discovery attach |
| Extension NM discovery (`extension/runtime/discoverRuntime.ts`) | no | Extension fails closed incorrectly or accepts bad payloads |
| Native host full request matrix | partial | Discover/open paths untested end-to-end |
| Desktop updater (`desktopUpdater.ts`, `githubReleaseClient.ts`) | no (semver only) | Wrong asset pick, prerelease consumption, portable replace bugs |
| Theme pack validation (`scripts/validate-builtin-themes.ts`) | script only, not in CI/check | Official theme token / recipe drift ships |
| Workspace queries / global search | no | Projection shape drift vs UI assumptions |
| CLI serve/stop/status | no | Process management regressions |
| UI canvas geometry / paste / placement | yes (pure) | Lower risk; covered well relative to codebase |
| UI drag/resize commit discipline | no automated | Policy depends on code review |
| Desktop package smoke (Setup/Portable launch) | no | Broken installer only found after Release publish |

## Findings

### F1 — Severity: high

Title: Core Runtime spine has no automated tests

Evidence: Grep of `src/**/*.test.ts` yields eleven files; none under `src/runtime/`, `src/core/application/`, `src/core/database/migrator.ts`, or `src/client/`. Command surface is fully registered in `src/core/application/databaseCommandRegistry.ts` (workspace/page/box/item/preferences/collection/system) with zero handler tests. History (`undoDatabaseCommand` / `redoDatabaseCommand`) and HTTP routes in `httpServer.ts` are untested.

Why it matters: This is the product’s authority path. A handler that omits a history row change, fails to bump revision, or returns wrong scopes will not fail CI.

Suggested fix: Introduce a Node SQLite (or in-memory adapter) fixture that opens Runtime DB via migrator, runs `executeDatabaseCommand`, asserts DB state + change set + revision + `deriveInvalidationScopes`. Add 5–10 golden commands first (page.create, box.create, box.updateFrame, item.create, preferences.setTheme, history.undo/redo).

### F2 — Severity: high

Title: CI verifies build + types, not product behavior of multi-client protocol

Evidence: `.github/workflows/ci.yml` runs `format:check`, `npm run check` (tsc + eslint + test:ts), `npm run build:all`. That is valuable but the test step only exercises pure helpers. No Runtime listen smoke, no client hello/command round-trip, no Desktop package, no theme validator.

Why it matters: Green CI currently means “compiles and pure units pass,” not “clients can talk to Runtime.”

Suggested fix: After `check`, add a short script: start Runtime on ephemeral port/data dir, `hello` + one command + query projection, stop. Fail job on non-zero.

### F3 — Severity: medium

Title: Release workflow skips `npm run check` and has no package smoke

Evidence: `.github/workflows/release.yml` runs `format:check` then `npm run release:build`, then publishes Setup/Portable + SHA256SUMS. No `npm run check`, no unit tests, no launch of the built exe, no installer dry-run.

Why it matters: A tag built from a branch that skipped PR CI (or workflow_dispatch on a bad SHA) can ship without static checks. Packaging can succeed while Main fails at runtime (preload path, missing asar assets).

Suggested fix: Run `npm run check` before `release:build`. Optionally launch portable with a timeout flag / `--smoke` if added, or at least verify expected files exist inside `win-unpacked` / asar (main.js, web-runtime index).

### F4 — Severity: medium

Title: Theme validation is documented but not gated

Evidence: `scripts/validate-builtin-themes.ts` exists; AGENTS.md / README / theme docs require it for new official themes. `package.json` `check` is only `lint && lint:eslint && test:ts`. CI does not call the script.

Why it matters: Recipe/id/settingsChrome opacity drift ships until a human remembers the script.

Suggested fix: Add `"validate:themes": "tsx scripts/validate-builtin-themes.ts"` and include it in `check` (or CI step after check).

### F5 — Severity: medium

Title: `ensurePreferencesThemeColumns` soft-compat contradicts AGENTS “no old schema” policy

Evidence: `src/core/database/ensurePreferencesColumns.ts` ADD COLUMNs missing preferences fields after migrator reaches CURRENT. Called unconditionally from `migrator.ts` after forward migrations. AGENTS.md: “项目禁止旧 Schema、旧字段、旧持久化格式和退休机制的兼容代码。” Prior architecture health review already flags this as should-fix.

Why it matters: Masks interrupted migrations / version/column skew; dual path for schema repair without tests.

Suggested fix: Time-box: either promote missing columns into a real forward migration step and delete the ensure module, or fail hard when columns missing after version == CURRENT. Add migrator tests for v0→9 and “already at 9.”

### F6 — Severity: medium

Title: Hand `DatabaseCommandResult` interface duplicates Zod schema

Evidence: `src/core/application/commandTypes.ts` exports `interface DatabaseCommandResult { createdPageId?; createdBoxId?; createdItemId? }`. `src/core/contracts/runtimeProtocol.ts` defines `databaseCommandResultSchema` with the same fields (`.strict()`). Call sites import the hand interface (`runtimeClient.ts`, `workspaceStore.ts`, `executeDatabaseCommand.ts`).

Why it matters: AGENTS requires Zod as boundary SoT and `z.infer` for types; dual shapes can drift (extra field on one side).

Suggested fix: `export type DatabaseCommandResult = z.infer<typeof databaseCommandResultSchema>` from contracts; delete hand interface.

### F7 — Severity: medium

Title: installChannel unit test is a copy-paste dual of production

Evidence: `src/desktop/update/installChannel.test.ts` redefines `isTypicalInstallDirectory` with a comment “Keep heuristics in sync with installChannel.ts.” Production function is non-exported and module imports `electron` `app`.

Why it matters: Classic dual-track test: green tests while production heuristic changes.

Suggested fix: Export pure helpers from `installChannel.ts` (env + path only); keep `detectInstallChannel` as thin electron wrapper. Test the pure export.

### F8 — Severity: medium

Title: No ESLint/import boundary for UI → Drizzle / schema / raw SQL IPC

Evidence: `eslint.config.js` has React + type-checked rules but no `no-restricted-imports` for `drizzle-orm`, `**/database/schema`, or `database:execute`. Current tree is clean: no drizzle/schema imports under `src/web-next`; no `database:execute` in `src`. Desktop ports also clean. Enforcement is human review only.

Why it matters: One accidental import reintroduces forbidden dual-write / UI DB coupling; CI will not fail.

Suggested fix: ESLint overrides for `src/web-next/**`, `src/extension/**` (except intentional paths), forbidding `drizzle-orm`, `**/core/database/schema`, etc. Optionally forbid `electron` in `src/runtime/**` and `src/client/**`.

### F9 — Severity: low / architecture compliance note

Title: Drag/resize appears policy-compliant; unenforced by tests

Evidence: `BaseBoxFrame.tsx` resize writes via `updateBoxFrame` only in pointer `onEnd`. Box drag uses `uiStore` / preview (`previewBoxOnPage` documented as local-only); commit is `moveBoxToPage` / `updateBoxFrame` in `BoxPageDropController.tsx` on drop. `SortableItemList` reorders on `onDragEnd`. Zustand stores (`uiStore`, `canvasStore`, `independentMenuStore`) hold ephemeral UI; workspace/preferences stores hold Runtime projection in memory without localStorage persist (no `persist`/`localStorage` in store modules).

Why it matters: Correct today; a future mid-drag `fireCommand` would not fail CI.

Suggested fix: Lightweight unit test around drop controller pure frame math; optional eslint ban on `fireCommand`/`dispatchCommand` inside known drag modules is fragile—prefer code review checklist + integration test later.

### F10 — Severity: low

Title: God-file / complexity hotspots without tests

Evidence (approximate end lines sampled):

| Module | ~LOC | Role |
| --- | --- | --- |
| `src/web-next/components/settings/SettingsPanel.tsx` | ~1130 | Settings UI |
| `src/web-next/components/boxes/BaseBoxFrame.tsx` | ~800 | Box chrome, drag, resize |
| `src/client/runtimeClient.ts` | ~760 | Shared client protocol |
| `src/runtime/httpServer.ts` | ~740 | All Runtime HTTP |
| `src/web-next/i18n/messages.ts` | ~650 | Copy dictionary |
| `src/core/application/itemCommandHandlers.ts` | ~540 | Item commands |
| `src/web-next/app/stores/preferencesStore.ts` | ~510+ | Preferences client store |
| `src/core/application/boxCommandHandlers.ts` | ~494 | Box commands |

Why it matters: High change frequency + no tests = high regression cost. `httpServer` and `runtimeClient` especially.

Suggested fix: Split HTTP route modules by domain; extract RuntimeClient stream/revision into testable pure helpers; command handlers already split by domain—add tests before further splits.

### F11 — Severity: low

Title: Naming dual-track `WebNext*` remains

Evidence: `startWebNextApp`, `WebNextApp`, `applyWebNextTheme`, `WebNextLocale`, `getRegisteredWebNextThemes`, etc. across `src/web-next/**`. Product name is Cardo. No second UI implementation found; dual is naming/API surface, not runtime dual path. Prior health review already listed this.

Why it matters: Confuses imports and review (“is there a non-WebNext app?”); not a functional dual-write.

Suggested fix: Incremental rename to product-neutral names when touching files; not a test blocker.

### F12 — Severity: low

Title: Type casts are rare but concentrated at protocol edges

Evidence: Grep found no `as any` / `@ts-expect-error` in `src`. Found `as unknown as` in `runtimeClient.ts` (`queryData` payload) and `runtime/database.ts` (sqlite rows). Non-null assertions sparse (`itemCommandHandlers` pin reorder filters; `pageCommandHandlers` map get).

Why it matters: Acceptable at boundaries; prefer narrowing via Zod discriminated unions so `queryData` does not cast.

Suggested fix: Pattern-match on `parsed.type` with typed return map instead of cast.

### F13 — Severity: low

Title: createExtensionPorts test is smoke-only

Evidence: Asserts `'database' in ports === false` and truthiness of method references. Does not invoke clipboard/tabs or validate Zod at NM boundary.

Why it matters: False confidence that Extension shell contract is solid.

Suggested fix: Keep smoke for “no database port”; add NM codec + discover schema tests (already partial in native-host).

## CI gaps

| Gap | PR/main CI today | Release today | Recommendation |
| --- | --- | --- | --- |
| Unit tests | yes (`test:ts` via `check`) | no | Run `check` on Release |
| Format | yes | yes | keep |
| Typecheck + ESLint | yes | no | add to Release |
| Theme validate script | no | no | add to `check` |
| Full product build | yes (`build:all`) | via `release:build` | keep |
| Runtime HTTP smoke | no | no | add small job/step |
| Desktop installer/portable smoke launch | no | no | Release-only smoke |
| Coverage report / threshold | no | no | optional later |
| Multi-OS matrix | windows-latest only | windows-latest | OK for v1 Desktop-first; revisit for CLI/mac |
| Artifact retention of CI builds | none (build only) | Release assets 30d | optional CI artifact for debugging |

Scripts reference (`package.json`):

- `lint` = `tsc --noEmit` (name is typecheck, not ESLint)
- `lint:eslint` = ESLint type-checked
- `check` = lint + eslint + test:ts
- `test` / `test:ts` = tsx node:test glob
- No `test:coverage`, no `validate:themes` npm script alias

## Policy enforcement gaps (convention-only rules)

| AGENTS policy | Enforced by? | Gap |
| --- | --- | --- |
| Runtime sole SQLite writer; clients via protocol | Architecture + code review; build structure | No test that Extension/Desktop paths never open sqlite |
| Writes only via Command Registry + single txn + op log/history | Implementation in `executeDatabaseCommand` | No tests that every mutating command writes op log / history when undoable |
| Zod boundary SoT; no hand business interfaces | Mostly followed; residual hand `DatabaseCommandResult` | No lint forbidding parallel interfaces |
| No Drizzle / schema in UI | Currently true by grep | No eslint restricted-imports |
| No Desktop business raw SQL IPC | Code structure | No test/lint for IPC channel allowlist |
| No Extension OPFS authority | `discoverRuntime` + comments | No test |
| Zustand only ephemeral UI; no full Workspace Snapshot persist | Stores design | No lint against persist middleware |
| No Command/DB write during drag/resize frames | Implementation review | No test |
| No old schema / retired field compatibility | Mostly; exception `ensurePreferencesThemeColumns` | Policy violated without CI signal |
| Official theme registration + validate script | Docs / AGENTS | Script not in `check`/CI |
| Trunk-based branching; no AI force-push main / silent release tags | Process (`AGENTS.md`) | GitHub branch protection assumed external; not verified in this review |
| Markdown output no bold (AI) | Process | N/A to product CI |

## Recommended test plan (next 2 weeks, prioritized)

Week 1 — Runtime authority (highest ROI)

1. Migrator fixture: empty DB → version 9; assert required tables/columns; reject v1/v2 and future versions. Target files: `src/core/database/migrator.test.ts`, adapter using Node `node:sqlite` or existing Runtime open path.
2. Command golden path (in-process DB, no HTTP): `page.create`, `box.create`, `item.create` (bookmark), `box.updateFrame`, `preferences.setTheme`; assert rows + `changes` non-empty + revision increments. File: `src/core/application/executeDatabaseCommand.test.ts`.
3. History: undo then redo one create; assert state restore + revision monotonic. File: `src/core/application/historyEngine.test.ts`.
4. InvalidationScope table-driven cases for preferences-only, app_state navigation, pages meta, single box_items, multi-table → projection. File: `src/core/application/invalidationScopes.test.ts`.
5. Wire `validate-builtin-themes` into `npm run check` (and thus CI).

Week 2 — Protocol + packaging edges

6. Runtime HTTP smoke script or test: startRuntime ephemeral dataDir/port → auth bootstrap/hello → command → query.projection → stop. Optionally assert SSE mutation event once.
7. RuntimeClient pure helpers: revision watermark rules (self-echo vs remote), parse error mapping; mock fetch for command.ok schema failures.
8. Export pure install-channel helpers; replace dual test; add GitHub release asset selection tests with fixture JSON (draft/prerelease skipped, Setup vs Portable name match).
9. Migrator/preferences: decide fate of `ensurePreferencesThemeColumns`; add regression test for chosen behavior.
10. Release workflow: add `npm run check` before build; minimal artifact existence assertions (already partial for Setup/Portable paths).

Defer (after 2 weeks unless regression hits)

- Playwright/extension e2e
- Full Desktop auto-update download (network)
- Coverage thresholds
- Split SettingsPanel/BaseBoxFrame without behavior change

## Appendix A — Grep snapshot (review date)

| Pattern | Result in `src` |
| --- | --- |
| `as any` | none |
| `@ts-expect-error` / `@ts-ignore` | none |
| `as unknown as` | `client/runtimeClient.ts`, `runtime/database.ts` |
| drizzle/schema imports under `web-next` | none |
| `database:execute` | none |
| `ensurePreferences` | migrator + `ensurePreferencesColumns.ts` only |
| `getCommandRefreshScope` | none (scopes via `deriveInvalidationScopes`) |
| `WebNext*` | widespread naming in `web-next` app/theme/i18n |

## Appendix B — Scripts and workflows

- PR/main: `.github/workflows/ci.yml` — format:check → check → build:all (windows-latest, Node 22)
- Milestone: `.github/workflows/release.yml` — format:check → version/tag → release:build → GitHub Release assets
- Local quality: `npm run check` does not equal full AGENTS merge gate (`build:all` is separate, as documented for feature merge)

## Appendix C — UI architecture compliance (spot check)

| Rule | Spot-check result |
| --- | --- |
| No Command mid-drag | Box drag commits on drop; resize commits on pointer end; item reorder on drag end |
| Zustand ephemeral | ui/canvas/independentMenu stores; no snapshot persist |
| No Drizzle in UI | clean |
| Workspace writes via Runtime commands | `workspaceStore` / `preferencesStore` fireCommand → RuntimeClient |

End of review f432f78a.

# Cardo full-stack review summary (f432f78a)

| Field | Value |
| --- | --- |
| Date | 2026-07-13 |
| Mode | Multi-subagent read-only health review (architecture, robustness, tests, desktop/clients) |
| HEAD context | main @ release v0.1.2 era (`7a5262b` spine + local tree) |
| Policy SoT | `AGENTS.md`, `docs/architecture/local-runtime-multi-client.md` |

## Detail reports

| Track | File | Subagent focus |
| --- | --- | --- |
| Architecture | `docs/reviews/f432f78a-architecture.md` | Runtime authority, Command/Query, Zod, lock, doc drift |
| Errors / logs / robustness | `docs/reviews/f432f78a-errors-logs-robustness.md` | Auth, fail-closed, logging, races, update integrity |
| Tests / code quality | `docs/reviews/f432f78a-tests-quality.md` | 11 unit files, CI/release gates, dual types, lint boundaries |
| Desktop / clients | `docs/reviews/f432f78a-desktop-clients.md` | Attach/embed, updater channels, packaging, Extension NM |

## Overall judgment

The multi-client Runtime architecture is real and largely policy-compliant: one SQLite authority, Zod HTTP clients, Command Registry single-txn + op log/history/revision, AppPorts non-DB, no Extension OPFS or Desktop `database:execute`, Desktop attach-first with detached embed child, Path SoT `cardo` / `cardo.sqlite`.

The product is not “architecturally broken.” Risk is concentrated in (1) multi-client session lifecycle after SSE drop, (2) SQLite concurrency of queries vs async mutation txns, (3) update integrity fail-open without SHA256, (4) uneven schema gates across surfaces, (5) almost no behavioral tests on the authority path, and (6) doc drift that can reintroduce dual-writer mistakes.

Static quality (tsc, ESLint type-checked, format, `build:all` on PR) is a real gate. Behavioral regression gate for Runtime is mostly missing.

## Severity rollup (deduped)

### High (ship-impacting or multi-client correctness)

| ID | Topic | Where | Action |
| --- | --- | --- | --- |
| H1 | SSE close fully unregisters client; reconnect does not re-`hello` | `httpServer` / `clients` / `runtimeClient` | Re-hello on reconnect or keep session idle timeout |
| H2 | Queries/export share one `DatabaseSync` outside CommandQueue while mutation txn awaits | `httpServer` + `executeDatabaseCommand` | Serial all DB access or dedicated read path |
| H3 | Domain failures often HTTP 500 `internal_error` | `httpServer` catch-all | Stable 4xx codes from command domain |
| H4 | `RuntimeClient.connect` can soft-succeed without first `ready` | `runtimeClient` | Fail closed on ready timeout |
| H5 | Update download proceeds if SHA256 missing; no re-hash at install | `githubReleaseClient` / `desktopUpdater` | Require SUMS; re-verify before spawn |
| H6 | Portable updater can fall back to Setup (silent channel migration) | `pickAssetForChannel` | No portable→setup auto-apply |
| H7 | Extension/CLI lack Desktop’s schema (and CLI lacks `/app/`) gates | `discoverRuntime`, `cli open` | Shared `assertRuntimeCompatible` |
| H8 | No automated tests on Runtime spine; CI = types + pure units + build | 11 tests, none under runtime/application | Migrator + command golden + HTTP smoke |
| H9 | Production Desktop/Runtime/CLI lack solid unhandledRejection crash surfaces | main / runtime-child / cli | Fatal handlers + lock cleanup |

### Medium (policy / ops / packaging completeness)

| Topic | Action |
| --- | --- |
| `ensurePreferencesThemeColumns` soft ADD COLUMN vs AGENTS no-compat | Delete or real migration + fail hard |
| Hand `DatabaseCommandResult` vs Zod dual | `z.infer` only |
| Release workflow skips `npm run check`; no package smoke | Run check before package |
| Theme validate script not in `check`/CI | Wire `validate-builtin-themes` |
| Native Host not in Desktop Setup → Extension often `native_host_missing` | Register host on install/first run |
| Structured Runtime logging almost absent | JSON lines to `runtime.log` (no secrets) |
| NM frame size uncapped; openExternal scheme open | Cap frames; http(s) allowlist |
| Retire incompatible Runtime timeout then spawn-anyway | Fail closed + `cardo stop` UX |
| Force-update for schema breaks missing | minClient / blocking dialog |
| No eslint restricted-imports (UI→drizzle, runtime→electron) | Lint boundaries |
| Error dialog hardcodes schemaVersion 9 | Interpolate `DATABASE_SCHEMA_VERSION` |
| installChannel test dual-track (reimplemented helper) | Export pure helpers |

### Low / polish

Dead `pageTabsAndState` scope; WebNext* naming; Chinese-only tray; god-file hotspots; electron-builder publish block accidental publish risk; baseRevision advisory (documented); session token in sessionStorage (local threat model).

## Strengths to preserve

1. Exclusive lock (`starting`/`ready`), discovery secrets isolation, Bearer + one-time bootstrap, CORS allowlist, 127.0.0.1 bind.
2. CommandQueue + client apply mutex + revision watermarks + self-echo ignore + fullCatchUp design.
3. Desktop attach-first / embed detached child; quit does not kill shared Runtime; preload fail-closed; no DB IPC.
4. Setup/Portable packaging + asarUnpack web-runtime alignment with updater preferred names.
5. Clean greps: no `as any` / `@ts-expect-error`, no drizzle under `web-next`, no `database:execute`.

## Priority backlog (suggested order for v0.1.3+)

### P0 — correctness / integrity (do first)

1. Fix SSE session lifecycle (H1).
2. Serialize or isolate SQLite access (H2).
3. Fail closed on missing SHA256 + re-verify at install (H5); block portable→setup auto-apply (H6).
4. Fail closed on first-ready timeout (H4).
5. Shared schema/`/app` compatibility gate for Desktop, CLI open, Extension (H7).

### P1 — operability / CI

6. Domain → 4xx error taxonomy (H3).
7. Process fatal handlers + structured Runtime logs (H9 + medium logging).
8. Migrator fixture + 5–10 command/history golden tests + optional HTTP hello smoke (H8).
9. Release runs `npm run check`; theme validate in check; optional win-unpacked asset assert.
10. Remove `ensurePreferencesThemeColumns`; collapse `DatabaseCommandResult` to `z.infer`.

### P2 — product completeness

11. Ship/register Native Host with Desktop Setup.
12. Force-update policy for schema/protocol breaks.
13. ESLint restricted imports; refresh architecture SoT (dual-DB mermaid, schema to 9, module paths, detached embed).
14. Desktop recovery copy: dynamic schema + packaged vs dev language.

## Doc drift (must-fix for SoT)

`docs/architecture/local-runtime-multi-client.md`: dual-DB mermaid as “现状”, schema ceiling “to 5” (code is 9), phantom `runtime/revision.ts` / `invalidation.ts`, Main-in-process embed diagram vs detached child only, NM relay not implemented, local-mode refresh scope note stale.

## Test coverage one-liner

Covered well: canvas geometry, paste draft typing, placement, semver, NM codec/partial request validation, menu clamp.  
Untested high-risk: Runtime HTTP, commands (~40), history, invalidation, migrator, RuntimeClient SSE/revision, lock/discovery/auth, updater (beyond semver), Extension discover, CLI process management.

## What not to do

- Do not rewrite the Runtime multi-client spine or reintroduce dual writers / OPFS authority / Desktop business SQL IPC.
- Do not add CRDT or full Workspace Snapshot as sync protocol.
- Do not treat green CI today as proof of multi-client Runtime health.

## Method note

Four parallel read-only general-purpose subagents produced the four detail files above. This summary dedupes and prioritizes only; evidence paths live in the detail reports.

# Worklog: schema-policy / Zod SoT (f432f78a)

Branch: `fix/runtime-hardening-cleanup-docs`

## Goal

Enforce AGENTS: no old-schema soft repair; Zod is SoT for command result type.

## Changes

### 1. Delete soft repair (`ensurePreferencesThemeColumns`)

- Deleted `src/core/database/ensurePreferencesColumns.ts` (post-version `ALTER TABLE … ADD COLUMN` shim).
- `src/core/database/migrator.ts`:
  - Removed import and unconditional call to `ensurePreferencesThemeColumns`.
  - Removed `listPreferenceColumns` helper and optional adapter hook.
  - Removed post-loop force `setUserVersion(DATABASE_SCHEMA_VERSION)` when already advanced by the forward loop.
  - Migrator now only: baseline (v0→3) + while-loop forward steps (each sets `user_version` inside the step transaction). Skew/missing columns fail at SQL use time rather than soft-repair.
- `createSqlExecMigratorAdapter`: dropped `listPreferenceColumns` option.
- `src/runtime/database.ts` `openRuntimeDatabase`: stopped passing `listPreferenceColumns` into the migrator adapter.

### 2. `DatabaseCommandResult = z.infer`

- `src/core/contracts/runtimeProtocol.ts`: added
  `export type DatabaseCommandResult = z.infer<typeof databaseCommandResultSchema>`
  next to `databaseCommandResultSchema` (schema remains wire SoT).
- `src/core/application/commandTypes.ts`: removed hand interface body; re-exports type from contracts:
  `import type { DatabaseCommandResult } from '../contracts/runtimeProtocol'; export type { DatabaseCommandResult };`
  `DatabaseCommandMutation` still uses the re-exported type.
- App-layer call sites (`runtimeClient`, `executeDatabaseCommand`, `workspaceStore`) keep importing from `commandTypes` (re-export path). Contracts own schema + type.

### 3. Grep

- No remaining TS/TSX references to `ensurePreferences*` or `listPreferenceColumns` after cleanup.
- Historical review docs under `docs/reviews/f432f78a-*.md` still mention the old path as findings (left as-is; not code).

## Out of scope (per task)

- httpServer domain errors
- clients session
- desktop update

## Verification

- Code review of migrator / openRuntimeDatabase / contracts / commandTypes only (no `build:all` in this slice unless requested).
- Policy: forward migrator is sole schema path; command result type is single `z.infer` derivation.

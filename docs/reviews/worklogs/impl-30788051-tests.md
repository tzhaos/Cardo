# Worklog: DomainCommandError + runtimeCompatibility unit tests (30788051)

Date: 2026-07-13  
Branch: `feature/hover-tip`  
Scope: unit tests only (no production behavior change).

## Goals

1. Lock `DomainCommandError` default HTTP status mapping (domain → 4xx).
2. Lock `assertRuntimeCompatible` schema equality and optional App UI gate.

## Files

| Path | Action |
| --- | --- |
| `src/core/application/domainError.test.ts` | new |
| `src/core/runtimeCompatibility.test.ts` | new |
| `docs/reviews/worklogs/impl-30788051-tests.md` | this worklog |

## Coverage

### DomainCommandError (`domainError.ts`)

| Code | Default `httpStatus` |
| --- | --- |
| `not_found` | 404 |
| `conflict` | 409 |
| `precondition_failed` | 400 |
| `invalid_command` | 400 |

Also asserts constructor sets `name`, `code`, `message`, and that an explicit `httpStatus` overrides the default.

### assertRuntimeCompatible (`runtimeCompatibility.ts`)

| Case | Expected |
| --- | --- |
| `schemaVersion === DATABASE_SCHEMA_VERSION` | `{ ok: true }` |
| older schema | `{ ok: false, code: 'schema_mismatch' }` |
| newer schema | `{ ok: false, code: 'schema_mismatch' }` |
| `requireAppUi: true` + `servesAppUi: false` | `{ ok: false, code: 'app_ui_missing' }` |
| `requireAppUi: true` + `servesAppUi: true` | `{ ok: true }` |
| `servesAppUi: false` without `requireAppUi` | `{ ok: true }` |

Uses live `DATABASE_SCHEMA_VERSION` so the suite stays valid when the schema bumps.

## Pattern

`node:test` + `node:assert/strict` via existing `tsx --test` (`npm run test:ts` glob `src/**/*.test.ts`).

## Production code

No changes. Helpers already match the documented policy; tests only document and guard it.

## Verification

Not run locally (Agents.md: AI default skip unit tests unless CI red). Discoverable by CI `test:ts` / `npm run check`.

# Worklog: error-screen recovery copy + dynamic schema (30788051)

Date: 2026-07-13  
Branch: `feature/hover-tip`  
Review refs: 30788051 F5 / ZH-01 / hardcode-audit error-screen items.

## Goals

1. Primary fatal recovery copy uses product language (start / reinstall / same version).
2. Interpolate `DATABASE_SCHEMA_VERSION` instead of literal schema `9`.
3. Drop soft-repair / preferences column / ui-system / web-runtime artifact jargon from primary en/zh steps.
4. Keep dual-locale structure; technical paths only in hints or collapsible detail.

## Scope

Edited only:

- `src/web/ui/cardo/error-screen.ts`
- this worklog

Did not edit `src/desktop/main.ts` (another agent) or error-screen CSS.

## Changes

### Import

```ts
import { DATABASE_SCHEMA_VERSION } from '../../../core/database/version';
```

### `classifyCardoError` copy rewrite

| Code | Primary steps (product) | Secondary (hints) |
| --- | --- | --- |
| `PREFERENCES_SCHEMA_MISMATCH` | Quit all windows, restart same version, reinstall if needed, avoid mixed installs | `cardo stop` + discovery `schemaVersion` = `${DATABASE_SCHEMA_VERSION}`; runtime.log |
| `RUNTIME_NO_APP_UI` | Restart / reinstall same version / match Desktop + local service | Developer rebuild note (no npm monologue as primary) |
| `RUNTIME_UNAVAILABLE` | Surface-aware: start Desktop / extension pairing / quit-reopen / open via app or cardo open | runtime.log |
| `WORKSPACE_INIT_FAILED` | Retry, full quit, wait after upgrade | runtime.log for lock/migration |
| `UNKNOWN` | Retry + keep logs | log path |

Titles/summaries: “Runtime / data authority / web-runtime 产物” → “本机服务 / local service” product wording. Codes and error-match regexes unchanged (still match raw Runtime messages).

### Footer

Replaced raw log path monologue with short help line pointing at technical details + local logs.

## Explicit removals from primary en/zh prose

- Hardcoded `schemaVersion is 9` / `schemaVersion 为 9`
- `npm run desktop:build` / `desktop:start` / `native-host:install` as main checklist
- `ui-system` workspace mixing
- “migrates preferences columns automatically” soft-repair language
- “web-runtime 产物 / artifacts/web-runtime” as user steps
- “数据权威 / data authority” architecture jargon

## Verification

Not run (`Agents.md`: no unit tests unless user-specified; build gates left to orchestrator). Suggest on merge path:

```text
npm run format:check
npm run lint
npm run lint:eslint
```

(and full CI gate if this lands with other feature/hover-tip work).

## Residual / out of scope

- Desktop `showErrorBox` / tray locale still owned by other agent on `main.ts`.
- error-screen remains a deliberate dual-locale catalog outside `messages.ts` (bootstrap may lack i18n prefs).
- Self-contained error-screen CSS palette unchanged by design.

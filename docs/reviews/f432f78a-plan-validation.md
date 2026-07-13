# Plan validation — first principles (f432f78a)

Date: 2026-07-13
Branch: fix/runtime-hardening-cleanup-docs

## Method

Strip claims to physics of the system: one process owns SQLite; clients are HTTP peers; installers are untrusted bytes; schema version is the only durable shape. Reject fixes that add dual-track compatibility, second writers, or soft-success on integrity.

## Claims vs first principles

| Claim | First principle | Verdict | Fix shape |
| --- | --- | --- | --- |
| SSE close unregisters client; reconnect reuses dead id | Session identity is server-side until bye/idle; stream is a channel not the session | Correct high bug | onStreamClose marks non-streaming; keep registry; idle sweep unregisters |
| Query vs async mutation on one DatabaseSync | One connection cannot safely interleave txn and external SELECTs across await | Correct high bug | All DB work through same serial queue; busy_timeout |
| SHA256 optional | Network bytes are untrusted; size is not integrity | Correct high bug | Require hash for stable channel; re-hash at install |
| Portable→Setup fallback | Install topology is user state; silent change is wrong product | Correct product bug | No auto channel migration |
| connect() soft-success without ready | Connected means event plane ready | Correct high bug | Fail closed on first ready timeout |
| Uneven schema gates | Same Runtime, same contract for all clients | Correct high bug | Shared assert; prefer equality (not only >=) |
| ensurePreferences soft ADD COLUMN | Schema version is truth; soft repair is dual-track | Correct policy break | Delete ensure; migrator only; fail hard on skew |
| Hand DatabaseCommandResult | Zod is boundary SoT | Correct policy | z.infer only |
| Domain throws → HTTP 500 | Business precondition ≠ internal crash | Correct medium | DomainError → 4xx codes |
| Missing process fatal handlers | Uncaught rejection can leave lock | Correct medium | Handlers + cleanup |
| Thin tests on Runtime | Not blocking this PR; AGENTS says do not run tests in AI flow | Defer automated Runtime tests unless user asks | Optional later |
| Doc drift dual-DB | Docs that lie create dual-writer regressions | Correct | Rewrite SoT; archive stale reviews |

## Explicitly out of scope this PR

1. Force-update modal product design (needs UX copy approval).
2. Shipping Native Host inside NSIS (packaging design; large installer change).
3. Full OCC on baseRevision (v1 design intentionally advisory).
4. CRDT / cloud sync.
5. Running unit tests (AGENTS: 不运行测试).

## Parallel work packages (non-overlapping owners)

1. session-client: clients.ts + runtimeClient.ts
2. db-serial: database.ts + httpServer query/export enqueue + domain error mapping
3. update-integrity: desktop/update/*
4. compat-gate: new core/runtimeCompatibility.ts + ensureDesktopRuntime + cli open + extension inject
5. schema-policy: delete ensurePreferences* + migrator + commandTypes z.infer
6. process-log: runtime index fatal + structured log helper + desktop/cli hooks
7. cleanup: dead dual docs, WebNext rename only if safe, eslint restricted imports optional
8. docs: rewrite local-runtime-multi-client.md + new architecture overview + README architecture pointers

## Success criteria

- No soft-success on integrity (hash, ready, schema).
- No dual-writer or dual-schema-repair paths.
- Architecture SoT matches code (schema 9, detached embed, single Runtime).
- build:all succeeds; PR to main.

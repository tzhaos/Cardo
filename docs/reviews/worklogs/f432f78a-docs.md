# Worklog: architecture docs refresh (code-aligned SoT)

Branch: `fix/runtime-hardening-cleanup-docs`

## Goal

Replace dual-DB / PR-era aspirational architecture prose with documentation that matches current code: single Runtime, schema 9, Desktop embed-detached, no OPFS, no `database:execute`.

## Deliverables

### 1. Rewrite `docs/architecture/local-runtime-multi-client.md`

- Single-Runtime mermaid topology only (no dual-DB "现状" as current)
- Path SoT: `cardo` / `cardo.sqlite` + lock / discovery / log / themes
- Surface matrix; Hard Decisions refreshed (HD includes session stream-vs-idle)
- Protocol summary: hello, command, query, events, auth bootstrap/exchange, session.bye, shutdown
- Client session SoT: stream close keeps session; bye / idle unregister
- Desktop attach-first + embed detached child (`ensureDesktopRuntime` / `runtimeChild`); Main never in-process `startRuntime`
- Extension NM discover-only primary path
- Migration: forward-only, `DATABASE_SCHEMA_VERSION=9`, no soft column repair; wild path 0→3→…→9
- Module map aligned to real paths (`core/database/revision.ts`, `core/application/invalidationScopes.ts`, `client/runtimeClient.ts`, …)
- Schema attach gate: `schemaVersion === DATABASE_SCHEMA_VERSION` via `assertRuntimeCompatible`
- Appendix A: historical dual-DB only
- Removed long PR0–PR7 rollout as primary narrative

### 2. New `docs/architecture/overview.md`

Executive overview: product, Runtime model, surfaces, repo map, how to run, how to release (`vX.Y.Z`), links to SoT.

### 3. New `docs/architecture/robustness-and-operations.md`

Ops: lock/discovery, log locations, stop/start, Desktop Setup/Portable channels, SHA-256 policy, recovery (`cardo stop`, schema mismatch), same-OS-user threat model.

### 4. New `docs/architecture/README.md`

Index with one-line descriptions.

### 5. Light README updates

- `README.md` / `README_zh.md`: Architecture pillars link to overview + SoT; Documentation table adds index, overview, robustness docs.

## Policy compliance

- No `**` bold in new/rewritten architecture Markdown
- Prefer Chinese for architecture SoT; English identifiers kept
- No `src/` code edits in this workstream
- No tests / build:all run (docs only)

## Out of scope

- Theme authoring rewrites
- Product roadmaps
- Code fixes for session/stream (documented as SoT; may land in parallel worklogs)

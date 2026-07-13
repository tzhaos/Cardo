# Group view modes

| Field | Value |
| --- | --- |
| Status | Architecture decision (v0.2+) |
| Date | 2026-07-14 |
| Product term | Group（分组）— formerly user-facing “Page” |
| Persistence | Page rows / pageId unchanged (internal ids) |

## 1. Naming

| Layer | Term |
| --- | --- |
| User UI (en) | Group |
| User UI (zh) | 分组 |
| Code / DB / protocol | `page` / `pageId` (no schema rename until a dedicated migration milestone) |

Sidebar “新建分组 / Groups list / 删除分组” copy lives in `src/web/i18n/messages.ts` under existing `page.*` / `shell.*` keys.

## 2. View modes (group content layout)

A group is a container of boxes. How those boxes are presented is a **view mode**, not a second shell:

| Mode id | Product meaning | Interaction |
| --- | --- | --- |
| `freeform` | Canvas (default) | Absolute `frame`; free drag / resize; free overlap |
| `waterfall` | Waterfall | Drag allowed; no free overlap; engine reflows columns and snaps frames |
| `list` | List | Boxes as serial rows (menu-like item list); no free 2D placement |

Contract SoT: `src/core/contracts/groupView.ts` (`groupViewModeSchema`).

```text
Group (page row)
  └── viewMode: freeform | waterfall | list
        ├── freeform → WorkspaceCanvas + absolute BoxFrame
        ├── waterfall → layout engine + constrained drag (future)
        └── list → serial Box rows (future)
```

## 3. Implementation plan (incremental)

1. Ship freeform as today (already production).
2. Persist per-group `viewMode` via preferences or page metadata (Zod only; no dual-read of retired fields).
3. Waterfall: column width + gap SoT; on drag end recompute frames; reject overlap permanently.
4. List: ignore freeform x/y for paint; order by explicit rank or y then x; row chrome reuses item-list density.

## 4. Non-goals (this milestone)

- Renaming SQLite `pages` table or Runtime protocol `pageId`
- Implementing waterfall/list UI in the same change as naming densification
- Folder trees of groups (still out of product IA)

## 5. Related

- Shell IA: `docs/architecture/web-v2-codex-shell-design.md` (paths now under `src/web`)
- Box item density: `src/web/styles/items.css`, `boxes.css`

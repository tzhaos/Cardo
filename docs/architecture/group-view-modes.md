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

| Mode id | Product meaning | Morphology | Interaction |
| --- | --- | --- | --- |
| `freeform` | Canvas (default) | Box (`UniversalBox`) | Freeform pan canvas; free drag/resize/overlap |
| `waterfall` | Waterfall | Card (`WaterfallCard`) | Scroll document; masonry cards; drag reorder + cross-page; reflow on drop |
| `list` | List | Grouped items (`GroupListSection` + item grid) | Scroll document; section per box + item grid; drag reorder + cross-page |

Contract SoT: `src/core/contracts/groupView.ts` (`groupViewModeSchema`).

```text
Group (page row)
  └── viewMode: freeform | waterfall | list
        ├── freeform → free canvas + box chrome
        ├── waterfall → GroupScrollSurface + cards
        └── list → GroupScrollSurface + grouped item grid
```

## 3. Implementation

1. Freeform box morphology (production).
2. Waterfall card + list grouped-item morphologies in scroll views (`src/web/features/group-views/*`).
3. Persist per-group layout via `page.groupViewMode` (+ column fields) and `page.setGroupLayout` Command; UI reads projection, not session-only store.
4. Drag reorder + cross-page for managed modes via `BoxPageDropController` reflow.

## 4. Non-goals (this milestone)

- Renaming SQLite `pages` table or Runtime protocol `pageId`
- Implementing waterfall/list UI in the same change as naming densification
- Folder trees of groups (still out of product IA)

## 5. Related

- Shell IA: `docs/architecture/web-v2-codex-shell-design.md` (paths now under `src/web`)
- Box item density: `src/web/styles/items.css`, `boxes.css`

# impl-30788051 — Hover tip + text-shell motion

Branch: `feature/hover-tip`

## Goal

1. Icon chrome: prefer `IconButton.tooltip` (product HoverTip) over native `title=`; keep `aria-label`.
2. Text shells: enter/exit use opacity only (no scale / slide transforms on those shells).

No redesign; no changes to `design-system.css` or `hover-tip.tsx`.

## Changes

### IconButton `title` → `tooltip`

| File | Change |
| --- | --- |
| `src/web-next/components/canvas/CanvasToolsToolbar.tsx` | `title={item.label}` → `tooltip={item.label}` |
| `src/web-next/components/top-bar/TopBar.tsx` | Fluent top-trailing canvas tools: same |
| `src/web-next/components/boxes/BaseBoxFrame.tsx` | Box header controls (lock / detail / layout / close) were `MotionButton` + native `title`; now `IconButton` + `tooltip` (close gained tooltip matching aria-label). Dropped unused `MotionButton` import. |

Left as native `title` (not IconButton chrome, or non-product-tip cases):

- Collection / add-view shells, settings headings, color picker hex, TabPill system page, clipboard row copy hint, promote / appearance controls that still use plain `Button`.

### Text-shell motion: opacity only

| File | Before | After |
| --- | --- | --- |
| `GlobalSearchPanel.tsx` | opacity + y + scale | opacity only |
| `ItemDeleteView.tsx` | opacity + x + scale (spring) | opacity only (`duration: 0.16`) |
| `CollectionPage.tsx` (collection box frame enter/exit) | opacity + scale | opacity only |

## Out of scope (this pass)

- `ItemContentEditView` / other item shells still on scale (same pattern as delete; can follow later).
- `ItemActions` IconButtons: never had `title`; still aria-label only.
- Settings close, drag handle, etc. without prior `title`.
- Box frame canvas entry/delete scale (product box geometry, not text shell).

## Verify

Not run (caller gate): `format` / `format:check` / `lint` / `lint:eslint` / `validate:themes` / `build:all`.

Manual: hover canvas tools, box header icon controls — Cardo bubble tip; open global search / item delete / collection box — no scale pop on shell.

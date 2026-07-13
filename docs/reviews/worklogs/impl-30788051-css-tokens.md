# Worklog: product CSS hardcode hex → design tokens

Branch: `feature/hover-tip`  
Date: 2026-07-13  
Related review: `docs/reviews/30788051-frontend.md`, hardcode audit theme/UI

## Goal

Replace product-surface brand/status hex (and classic-blue rgba rings) with existing `--cardo-*` tokens so theme packs and user accent overrides recolor shared UI. No second token system.

## Changes

| File | Before | After |
| --- | --- | --- |
| `src/web-next/styles/add-views.css` | `.cardo-add-primary` `#60a5fa` / `#ffffff` | `var(--cardo-blue)` / `var(--cardo-create-text)` |
| `src/web-next/styles/boxes.css` | delete confirm `#ff3045` / `#ffffff` | `var(--cardo-red)` / `var(--cardo-create-text)` (aligned with item delete) |
| `src/web-next/styles/shell.css` | runtime banner reconnect `#d97706`, disconnect `#dc2626` | `var(--cardo-orange)` / `var(--cardo-red)` |
| `src/web-next/styles/settings.css` | layout/theme card selected rings `rgba(59, 130, 246, …)` | `color-mix(…, var(--cardo-blue) …)` matching pack-card-selected pattern |
| `src/web-next/styles/motion.css` | enter-item flash `rgba(78, 143, 255, 0.18)` | `color-mix(in srgb, var(--cardo-blue) 18%, transparent)` |
| `src/web-next/styles/themes/glass/index.css` | settings shell `#f9fafd` / `#12131c` | `var(--cardo-settings-chrome)` (pack SoT: glass light `#f4f6fb`, dark `#141522`) |

## Intent preserved

- Blue CTA / selection: still accent blue, now live token
- Danger delete: single `--cardo-red` with item delete path
- Warning reconnect: amber via `--cardo-orange`
- Glass settings shell: opaque chrome from pack `settingsChrome`, decorative radial wash unchanged

## Out of scope (not edited)

- `items.css` type accent hex map (`#64748b` / purple / …) — separate semantic map
- Recipe dialect `#ffffff` / `#000` color-mix glass tints and platform traffic lights
- Switch thumb pure white, soft shadow rgba neutrals
- Theme pack JSON values (already token SoT)

## Verify

- Grep: no remaining `#60a5fa`, `#ff3045`, `#d97706`, `#dc2626`, `#f9fafd`, `#12131c`, or classic blue rgba selection rings under `src/web-next/styles` product files (only `tokens.css` selection-ring default remains as bootstrap)
- Visual: classic + glass light/dark settings shell; add primary CTA; box delete confirm; runtime banner reconnect/disconnect; layout/theme card selection ring
- Optional later: `npm run validate:themes` if pack chrome values are tuned to match prior recipe hex more closely

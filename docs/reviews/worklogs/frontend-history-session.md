# Frontend UI problems, lessons, and decisions (Grok session history)

Date: 2026-07-13  
Scope: Read-only scan of Grok session compaction / recaps for Cardo (KhaosBox workspace). Worklog write only; no product code or AGENTS.md changes.

## Source files scanned

Primary KhaosBox sessions under `C:\Users\Tian\.grok\sessions\D%3A%5CWorkspace%5CKhaosBox\`:

| Session id | Compaction / materials | UI-relevant focus |
| --- | --- | --- |
| `019f5670-c285-75f2-999f-a7cfde6ae5fa` | `compaction/INDEX.md`, `segment_000.md`, recap_requests | Release packaging, force classic, UI “gone”, web-runtime/asar, format/CI, i18n trim |
| `019f51ce-9048-79e0-8588-7bfd81b6b64d` | `compaction/INDEX.md`, `segment_000..002.md` | Runtime multi-client, brand/tray, drag layoutId, product copy, themes, bounce/selection |
| `019f5346-7f9f-7a73-a88f-cdd6944d03c6` | `compaction/INDEX.md`, `segment_000..003.md`, `goal/plan.md` | Health review, Fluent polish, blur/Motion, settings tokens, multi-theme Glass/Material/SwiftUI |
| ui-system worktree `…\ui-system\019f52cd-bf88-7811-a37e-f4789c690467` | `compaction/INDEX.md`, `segment_000.md` | Theme system A–D, wbn→cardo, preferences Zod, Desktop /app, error-screen bootstrap |

Also listed (lighter or non-UI primary): sibling subagent folders under the same session tree; `019f5693-*` (README, not UI shell); parallel worklogs already in-repo (`hardcode-audit-*.md`, `copy-audit-*.md`) used only as cross-check of residual debt, not as primary session evidence.

Keyword hits used for extraction: theme, tooltip, hover, i18n, copy, classic, zen, Motion, scale, drag, CSS, token, hardcode, 壳层, Runtime, format, tray, error-screen, WebNext, glass, fluent, blur, settingsChrome, layoutId, bounce, product-copy.

## Problems (bullets with short evidence)

Motion / blur / text shells

- Fluent settings repeatedly “整体都糊”: Motion `scale` / `layoutId` / `whileTap`, `backdrop-filter`, `drop-shadow` on small glyphs, and soft multi-layer gradient nav SVGs. Fix path: CSS dual-glyph (no Motion) for language/mode icons; static segment indicator; no filter on Fluent nav; flat solid icons; kill settings-window blur. Evidence: `019f5346` segment_001 summary; comment “Static indicator — no Motion scale (blurred text under Fluent)” in `019f5670` settings work.
- Color preset chips hover/active blur: box-shadow rings + overflow:hidden + scale hover. Fix: nested fill + solid border ring, no shadow/scale (`019f5346` segment_001).
- Cross-page box looked circular: Motion `borderRadius` as pill/CSS-var vs numeric 16/24; theme radius not owned by `--cardo-box-radius`. Evidence: `019f5346` segment_000 Errors and Fixes; plan.md deviation “box-radius ownership”.

Theme / token ownership

- settingsChrome / settingsHover “no effect”: hardcoded `#ffffff` / non-token CSS, then recipe blue shadows overriding pack tokens. Need `var(--cardo-settings-chrome/hover)` and opaque settings shell (`019f5346` segment_001; AGENTS theme rules echoed in session system prompts).
- Multi-theme packs sharing one recipe file mixed Classic/Fluent; user forced split `styles/themes/{classic,fluent,glass,material,swiftui}` + recipes under `[data-cardo-theme]` (`019f5346` segment_001–003).
- Glass almost overwrote Classic as a skin; Classic restored as separate official id; Glass light Ethereal / dark Dark Glass (`019f5346` segment_002).
- Built-in themes lived as TS objects while user packs were file/JSON; product intent: same Zod document format, folder import, dual light/dark, research-verified palettes not invented hex (`019f51ce` segment_002).
- Color looks / themeColorOverrides appeared broken without optimistic prefs patch (`019f5346` segment_002–003).
- CSS import order: settings surfaces partial until themes load last (`019f5346` segment_003).
- Theme CSS stale after edits (“hover no change”, “5px halo”): rebuild required; agents mis-blamed code (`019f5346` segment_000).

Layout / chrome / classic vs floating / zen

- Floating and zen modes shipped then needed many proximity-reveal fixes; user later demanded force classic only. UI “gone” after packaging was zen + old install under `Programs\Cardo`, not the new artifact (`019f5670` summary: force-classic removes floating/zen; “still no UI → root cause wrong”).
- Fluent TopBar mis-grouped system entries into trailing; user: Collection | pages | Recycle | + like Classic adjacency; unify trailing canvas tools; Fluent bottom command bar (`019f5346` segment_000).
- Tab indicator desync with box drag: Motion `layoutId` / layout springs while `draggedBoxId` (`019f51ce` segment_001 → freeze layout during drag).
- Box fling bounce on normal drop: springs + reproject → tween + latestFrame (`019f51ce` segment_002).
- Placement mutex: only on cross-page tab release; resize may overlap (`019f51ce` segment_002).
- Settings panel drag broken when chrome/icons redesigned; need independent menu drag + `data-no-menu-drag` exclusions (`019f5346` segment_001).

i18n / product copy

- User rejected draft/process UI: multi-client / Runtime architecture explainers, extension “how Runtime works” runbook, roadmap phrases like “留给后续扩展” (`019f51ce` segment_001; `019f5346` plan deviations; later `fix(i18n): shorten remaining settings draft copy` in git history visible in `019f5670`).
- Selection policy: only content labels selectable; tab/box titles and chrome must not be (`019f51ce` segment_001–002, shell.css user-select).
- Settings copy: no trailing periods; look UI “文案不正式太啰嗦” (`019f5346` segment_002–003).
- Residual debt still noted in later hardcode/copy audits (session-adjacent): error-screen monologue + hardcoded schema 9; Desktop tray Chinese-only / Runtime jargon; dead Zen keys (`layout.exitZen`); seed English-only titles — consistent with session themes, not re-derived here as new incidents.

Runtime / Desktop / packaging that wiped UI

- Preferences Zod invalid_value when DB stuck at user_version=5 missing theme columns; Desktop attach to old Runtime without matching `/app` static → empty or error UI; ensurePreferencesColumns + refuse incompatible Runtime + re-embed (`ui-system` segment_000).
- CLI schema behind DB (5 vs 9) → `cardo:build`; EBUSY / stale discovery / old khaosbox path → path SoT `%APPDATA%/cardo` (`019f51ce` segment_002).
- Packaged Setup/Portable missing web-runtime until package copy + `asar.unpacked` (`019f5670`).
- Extension NM: SEA missed `zod` → “无法与 NM Host 通信”; health failed on stale discovery (`019f51ce` segment_001).
- Preferences multi-client not syncing: command/SSE deadlock without optimistic local patch / scopeApplyDepth (`019f51ce` segment_001).
- Reconnect banner placement (bottom-right) productized as formal reconnect copy keys (`019f51ce` / messages work in `019f5670`).

Brand / tray / naming

- Logo “完全不像” until simplified orbit mark; must wire extension, tray, electron-builder ico, favicon together (`019f51ce` segment_001–002).
- wbn-* and khaos-* dual class tracks → full rename to cardo-* (`ui-system` segment_000).
- Product name Cardo only; WebNext is internal bootstrap/root naming, not user-facing.

Process / CI that blocked UI delivery

- PR prettier / `format:check` failed after multi-agent edits (README PR #4; AGENTS later codified format-before-build gate) (`019f5670`).
- “能编译 ≠ 视觉正确”: stale artifacts, wrong install path, wrong layout profile, and missing web-runtime all presented as “UI broken”.

## Implied rules

Motion and visual ownership

1. One owner per CSS property per state: Radix (a11y/focus), Motion (continuous spatial only), CSS (color/border/simple hover), Drag Controller (drag root transform). Do not animate text shells with scale/layoutId.
2. Prefer opacity + left/top (integer pixels) over scale/transform on labels, dual-glyph state icons, settings chrome, and color chips.
3. No `backdrop-filter` / soft multi-filter stacks on settings windows or small nav icons when crisp Fluent (or any solid) chrome is required; settings shell background must be opaque (`--cardo-settings-chrome`).
4. Motion geometry that must match theme radius uses numeric values synced to tokens (`--cardo-box-radius`), never pill 9999 or unresolved CSS vars in Motion props.
5. Freeze layoutId / layout springs while box drag or other exclusive transforms run.

Theme system

6. Design Token + Theme Pack is the only skin surface; JSON tokens + `styles/themes/<id>` recipes on `[data-cardo-theme]`; no second skin engine or TSX-hardcoded official skins as long-term SoT.
7. Official themes: dual light/dark; register id + recipe; validate (`validate:themes` / builtin script); research palettes; structural change to boxes via recipes, not recolor-only.
8. Overridable chrome tokens (settingsChrome, settingsHover, accents) must flow pack → CSS vars → components; recipes must not silently override pack colors with hard hex.
9. CSS import order: base then theme dialects last so shared settings tokens can be overridden per pack.
10. Prefer optimistic preference patches for theme/look so UI does not wait a full SSE round-trip to paint.

Layout and product chrome

11. Classic shell adjacency for system pages (Collection | pages | Recycle | +) is the structural baseline; theme dialects restyle, they do not invent a new information architecture without explicit product OK.
12. Floating/zen/immersive chrome-reveal are high-risk; if forced off (classic-only), delete or hard-disable modes rather than leave “UI gone” prefs active on install.
13. When debugging missing UI: verify install path (not old Programs\Cardo), layout profile, packaged web-runtime presence, Runtime schema vs UI artifact match — before rewriting layout code.
14. Drag/resize frames: no Command, no DB write, no full Workspace commit.

Copy and i18n

15. Product UI is formal, short, bilingual via `messages.ts` + `t()`; no draft/roadmap/process/developer monologue; no internal codenames (WebNext, Khaos, OPFS architecture, “壳层”) for end users.
16. Only content text is user-selectable; chrome, titles of chrome controls, and system tab chrome follow selection policy.
17. Tray, error-screen, dialogs, updater strings are product surfaces: locale-aware and non-technical where possible; schema version from constants not magic “9”.

Runtime / surfaces

18. All graphical surfaces share WebNext + RuntimeClient; Desktop attach-first / embed-if-missing with schema + `/app` gates; no second SQLite writer.
19. Bootstrap/error-boundary/error-screen is the unified failure path for preferences Zod, schema mismatch, and missing static UI — not bare text.
20. Brand assets (mark, ico, tray, extension icons, favicon) change together.

Delivery process

21. After multi-agent UI edits: `format` + `format:check` before claiming green; build alone is insufficient for CI or for visual QA.
22. Rebuild extension/desktop/web-runtime and restart Runtime after CSS/theme changes; do not trust long-lived attached Runtime or old installers.
23. Migrate components by matching geometry first; delete old dual-track (wbn/khaos/old recipes) in the same initiative, not long dual-run.

## Gaps (unclear)

- Whether floating/zen remain permanently retired vs temporarily force-classic for v0.1.x; stash on `fix/update-card-layout` at release time suggests unfinished layout work (`019f5670`).
- Tooltip component exists (`@radix-ui/react-tooltip`, `ui/primitives/tooltip.tsx`) but session summaries rarely name tooltip-specific regressions; any tooltip blur/position rules are not evidenced here.
- Hover chrome on tabs: sessions both removed hover/drop chrome and later rebuilt Fluent/theme hovers — final per-theme hover policy is only partially spelled out in compaction summaries.
- File-based builtins vs code `builtInPacks` migration completion status at each session end is inconsistent across segments; current tree may have advanced past the last compacted state.
- How far “no Motion on any settings control” is absolute vs Fluent-only; Classic glass material still uses blur intentionally for floating chrome, which can conflict with “settings must be crisp”.
- SSE reconnect without re-hello (f432f78a review in `019f5670` recaps) is a client reliability issue that can look like “UI stuck”; full frontend UX contract for half-dead sessions is not finished in these UI sessions.
- Tray/error-screen formalization and dead Zen i18n keys appear in later audits; whether fixed on main after those audits is outside this session scan.
- Exact product decision on settings density: earlier “settings too rich → theme only” vs later deep Fluent/Material/SwiftUI settings (fonts, features, looks) — product bar moved repeatedly; no single frozen settings IA in history alone.

---

End of session-history extraction.

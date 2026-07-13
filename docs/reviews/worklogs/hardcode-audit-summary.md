# Hardcode audit summary (parallel, 2026-07-13)

Read-only. Five subagents. Detail reports:

| Track | File |
| --- | --- |
| UI strings | hardcode-audit-ui-strings.md |
| Config / paths / versions | hardcode-audit-config.md |
| Desktop / packaging / updater | hardcode-audit-desktop.md |
| Theme / CSS tokens | hardcode-audit-theme-ui.md |
| i18n parity / dead keys | hardcode-audit-i18n.md |

## Overall

Main workspace chrome is largely i18n-backed (`messages.ts` + `t()`), en/zh key sets match, and Path SoT / schema version constants exist for core Runtime. Hardcoding risk is concentrated in error surfaces (developer monologue, literal schema 9), Desktop tray/dialogs (locale-fixed), updater error English, theme hex bypasses, dead i18n keys (including Zen leftovers), and a few multi-file constants (GitHub repo, artifact names).

## P0 — fix soon (user-visible or version drift)

1. error-screen.ts: hardcode `schemaVersion is 9` → interpolate DATABASE_SCHEMA_VERSION; replace monorepo npm runbook with product recovery copy for packaged users.
2. Desktop tray: Chinese-only labels including 「Runtime」 → locale-aware formal product wording.
3. Desktop showErrorBox / updater errorMessage: English-only technical strings shown in Settings About.
4. Extension manifest version not synced from package.json on bump.
5. Remove dead product copy keys that imply unshipped UX (layout.exitZen; large unused settings block if UI never surfaces it — or wire UI).

## P1 — centralize / consistency

1. GitHub owner/repo: releaseChannel env vs UA hardcode vs package.json publish block.
2. Artifact name patterns duplicated (package.json, build-pipeline, release.yml, githubReleaseClient).
3. Icon size 256KiB, client-id header name, transfer format strings — shared constants.
4. Native-host log dir under LOCALAPPDATA vs Path SoT APPDATA — document or align.
5. Theme CSS: replace raw hex (CTA blue, delete red, banner amber) with design tokens.
6. User-facing jargon: Chrome/shell, Runtime, GitHub milestone, Desktop build, tokenThemePack wording in messages.

## P2 — polish

1. Seed workspace page titles English-only in DB.
2. WebNext* internal names (code only — not user-facing values).
3. z-index / geometry magic numbers without shared ladder.
4. package.json version 0.1.0 vs release tag v0.1.2 history (product version SoT is package; release tags bump at milestone).
5. ~81 unused i18n keys (history labels, unfinished settings) — prune or productize.

## Clean areas

- No user-facing Khaos / WebNext product strings (About value is Cardo).
- No wbn- / khaos- CSS dual-track under src/.
- Official theme ids registered and validated.
- Path SoT cardo/cardo.sqlite centralized in paths.ts.
- DATABASE_SCHEMA_VERSION used for attach/compat (error-screen exception).
- i18n en/zh key parity complete; no missing t() keys.
- No Programs\Cardo production hardcode (test fixture only).
- Updater uses env-overridable owner/repo for API; no GH_TOKEN in app.

## Recommended fix order (if implementing next)

1. error-screen formal + dynamic schema + packaged vs dev copy.
2. Tray + startup dialog locale + formal wording.
3. Updater error codes mapped to i18n messages.
4. Prune layout.exitZen and clearly dead keys; rewrite informal About/Update strings.
5. Tokenize high-traffic CSS hex.
6. Single CARDO_GITHUB_* SoT for UA + release channel.

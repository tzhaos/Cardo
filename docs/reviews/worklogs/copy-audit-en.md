# English user-facing copy audit (Cardo)

Date: 2026-07-13  
Scope (read-only): `src/web/i18n/**`, `src/web/features/**`, `src/web/platform/**`, `src/web/ui/cardo/error-screen.ts`, `src/extension/bootstrap/**`, built-in theme pack en strings under `themes/builtin/**`, Desktop update / startup strings that surface in UI.  
Product name rule: user-facing copy must say Cardo (not WebNext / KhaosBox).  
No product code was changed.

Summary: day-to-day canvas, menus, Favorites/Recycle Bin, and most Settings labels are already formal and product-shaped. The main gaps are (1) Settings About / Updates / feature blurbs that leak engineering vocabulary (Chrome, Runtime, GitHub milestone, Design tokens), (2) fatal error screens written as developer runbooks, (3) leftover codename in i18n key `settings.webNextEdition`, and (4) minor product-term inconsistency (Collected Items vs Favorites). No KhaosBox, OPFS, lorem, or Chinese-in-English-locale product strings were found in the scanned user-facing surfaces.

---

## Issues

### C-EN-1
- Path: `src/web/i18n/messages.ts` ~216 (used in `SettingsPanel.tsx` About → Updates)
- Current: "Check GitHub milestone releases for Desktop"
- Problem: Planning / engineering language in Settings UI (“milestone”, distribution channel name “Desktop” as if internal). Users should not need to know GitHub release process.
- Suggested formal: "Check for updates from the official Cardo release channel."

### C-EN-2
- Path: `src/web/i18n/messages.ts` ~232
- Current: "Check GitHub for a newer Desktop build."
- Problem: “build” and “GitHub” are developer monologue; idle update status should sound like a product, not a CI artifact.
- Suggested formal: "Check whether a newer version is available."

### C-EN-3
- Path: `src/web/i18n/messages.ts` ~242; shown in About (`SettingsPanel.tsx` ~929–930)
- Current: label "Theme system" / value "Design tokens + Theme Pack"
- Problem: Internal architecture jargon exposed on About. End users do not need design-token marketing.
- Suggested formal: label "Theming" / value "Theme packs" (or hide the row entirely if it is not product-useful).

### C-EN-4
- Path: `src/web/i18n/messages.ts` ~101
- Current: "Runtime connection toast"
- Problem: Internal codename “Runtime” and UI implementation term “toast” in a Settings feature description.
- Suggested formal: "Show connection status messages"

### C-EN-5
- Path: `src/web/i18n/messages.ts` ~75, ~77, ~132, ~187
- Current: "Chrome and workspace tools" / "Chrome always visible" / "Chrome features" / "Chrome spacing"
- Problem: “Chrome” is shell/UI-engineering jargon; reads as the browser brand or incomplete copy. (Note: some of these keys are currently catalog/layout leftovers rather than live Settings rows, but they remain en locale product strings.)
- Suggested formal: "Interface and workspace tools" / "Interface always visible" / "Interface features" / "Interface spacing"

### C-EN-6
- Path: `src/web/i18n/messages.ts` ~86, ~133
- Current: "Show or hide shell tools"
- Problem: “shell” is architecture language; inconsistent with everyday product wording.
- Suggested formal: "Show or hide interface tools"

### C-EN-7
- Path: `src/web/i18n/messages.ts` ~231
- Current: "Updates require a packaged Desktop install."
- Problem: Packaging/channel jargon (“packaged”, “Desktop install”) rather than user-facing install type language already used nearby (Installed / Portable).
- Suggested formal: "Updates are available only for installed or portable Cardo apps."

### C-EN-8
- Path: `src/web/i18n/messages.ts` ~213; key name `settings.webNextEdition` (value currently "Cardo")
- Current: key `settings.webNextEdition` → "Cardo"
- Problem: Value is fine; key still embeds retired codename WebNext. Risk of future copy regressing to “WebNext edition”. User-visible string is OK today.
- Suggested formal: Rename key to `settings.productName` or `settings.edition` (keep value "Cardo").

### C-EN-9
- Path: `src/web/i18n/messages.ts` ~263; used in `BaseBoxFrame.tsx` ~606
- Current: "Collected Items"
- Problem: Product term elsewhere is Favorites / Favorite boxes; “Collected Items” is inconsistent and slightly draft-like.
- Suggested formal: "Favorite items" or "Favorites" (match `page.collection` / `menu.addToCollection` vocabulary)

### C-EN-10
- Path: `src/web/i18n/messages.ts` ~198
- Current: "Export command history"
- Problem: “command” is internal Command Registry vocabulary.
- Suggested formal: "Export activity history" or "Export operation history"

### C-EN-11
- Path: `src/web/i18n/messages.ts` ~111
- Current: "Active page and undo are shared across connected clients"
- Problem: “clients” is multi-client architecture talk; slightly developer-facing (string may be unused in current Settings UI but remains en locale).
- Suggested formal: "The current page and undo history stay in sync across open Cardo windows."

### C-EN-12
- Path: `src/web/i18n/messages.ts` ~78
- Current: "Exit Zen"
- Problem: Incomplete feature label with no surrounding polish; “Zen” as a mode name without Settings/help context reads like WIP. (Key appears unused in components today.)
- Suggested formal: If shipping: "Exit focus mode". If not shipping: remove from en locale until the feature lands.

### C-EN-13
- Path: `themes/builtin/classic/theme.cardo-theme.json` ~12
- Current: "Soft glass chrome."
- Problem: “chrome” jargon in a user-visible theme description on the Appearance theme cards.
- Suggested formal: "Soft glass interface."

### C-EN-14
- Path: `themes/builtin/swiftui/theme.cardo-theme.json` ~12
- Current: "App design language."
- Problem: Vague / draft marketing fragment; does not describe what the user sees.
- Suggested formal: "Clean iOS-inspired panels and controls."

### C-EN-15
- Path: `themes/builtin/material/theme.cardo-theme.json` ~12
- Current: "Google AI Studio design language."
- Problem: Third-party product reference that may confuse users and ages poorly; reads like internal mood-board notes.
- Suggested formal: "Material-inspired surfaces and accent colors."

### C-EN-16
- Path: `src/web/ui/cardo/error-screen.ts` ~67–97 (PREFERENCES_SCHEMA_MISMATCH)
- Current: "Preferences from Runtime do not match this Cardo build (often a stale Runtime or a database that has not migrated theme fields yet)." + steps including `npm run desktop:build`, `schemaVersion is 9`, mixing checkouts.
- Problem: Verbose developer monologue on a user-facing fatal screen: Runtime, migration, schemaVersion, npm scripts, repo checkouts.
- Suggested formal: Title "Cardo needs to restart after an update"; summary "This version of Cardo cannot read your current settings data."; steps: "Close all Cardo windows." / "Quit Cardo completely, then open it again." / "If the problem continues, reinstall Cardo or contact support with Technical details." Keep npm/schema only under Technical details for developers.

### C-EN-17
- Path: `src/web/ui/cardo/error-screen.ts` ~102–125 (RUNTIME_NO_APP_UI)
- Current: "Runtime is up but is not serving the /app static UI. Desktop needs a web-runtime build that matches this app." + `artifacts/web-runtime/index.html`
- Problem: Internal paths (`/app`, web-runtime, artifacts) and build instructions are not end-user copy.
- Suggested formal: "Cardo started but the app interface files are missing or incomplete. Reinstall Cardo, or repair the installation, then try again."

### C-EN-18
- Path: `src/web/ui/cardo/error-screen.ts` ~134–176 (RUNTIME_UNAVAILABLE)
- Current: "Cannot connect to Cardo Runtime" / "The UI needs a local Cardo Runtime as the data authority..."
- Problem: Exposes architecture (“Runtime”, “data authority”). Steps include `cardo serve`, `npm run native-host:install`, token URL hygiene — useful for power users, harsh for general users.
- Suggested formal: Title "Cannot connect to Cardo"; summary "Cardo is not running on this computer, or this window could not join it."; steps for extension: "Open the Cardo desktop app." / "Fully quit and reopen the browser, then Retry." / "Reinstall Cardo if the problem continues." Put CLI/token notes under Technical details.

### C-EN-19
- Path: `src/web/ui/cardo/error-screen.ts` ~206–213
- Current: "Cardo hit a problem" / "An unclassified error occurred."
- Problem: Slightly chatty (“hit a problem”) and internal classification language (“unclassified”).
- Suggested formal: "Cardo could not continue" / "An unexpected error occurred."

### C-EN-20
- Path: `src/web/ui/cardo/error-screen.ts` ~364–365
- Current: "Logs: %APPDATA%\\cardo\\runtime.log · discovery.json"
- Problem: Always-on developer footer; fine for advanced recovery but dense for default UI. Also hard-codes Windows path form only.
- Suggested formal: "Support logs are available under Technical details." or show path only after expanding technical details.

### C-EN-21
- Path: `src/web/platform/hostPlatform.ts` ~108–109, ~135–136 (thrown messages often land on error screen)
- Current: "Desktop Runtime config missing. Main must inject window.__CARDO_RUNTIME__ via preload before load." / "Runtime mode requested but no token. Open via `cardo open` (one-time code bootstrap)." / "Cardo Runtime is not connected. Start Cardo CLI/Desktop and ensure the native messaging host is installed."
- Problem: Raw engineering errors shown as summary when classification falls through or mirrors Runtime copy; mentions preload, window globals, CLI, native messaging host.
- Suggested formal: Map these to short user summaries in `classifyCardoError` and keep the raw text only as detail. Example: "Cardo could not start its connection. Quit and reopen the app." / "Open Cardo from the app or `cardo open`, then try again."

### C-EN-22
- Path: `src/extension/bootstrap/runtimeGuide.ts` ~51–54
- Current: "Stop Cardo on this computer (quit Desktop or run cardo stop)."
- Problem: Mixes product “Desktop” channel name and CLI command into extension onboarding; slightly developer-facing for browser users.
- Suggested formal: "Fully quit Cardo on this computer (close the desktop app)." Optional secondary: "Or run cardo stop in a terminal." only if you intentionally support CLI users.

### C-EN-23
- Path: `src/extension/bootstrap/runtimeGuide.ts` ~66
- Current: "Something went wrong. Please try again."
- Problem: Mild conversational / generic apologetic tone (acceptable as fallback, but softer than the rest of the guide).
- Suggested formal: "Cardo could not start. Try again."

### C-EN-24
- Path: `src/desktop/update/desktopUpdater.ts` ~109 (surfaces in Settings via `state.errorMessage`)
- Current: "Updates are only available in packaged Desktop builds."
- Problem: Same packaging jargon as C-EN-7; not localized through i18n.
- Suggested formal: "Updates are available only in the installed Cardo app." (and prefer i18n keys over hard-coded English)

### C-EN-25
- Path: `src/desktop/update/desktopUpdater.ts` ~186, ~211, ~247, ~288–291 (error strings shown in Settings)
- Current: e.g. "No update is available to download. Check for updates first." / "Update has no SHA-256; refusing download without integrity metadata." / "Installer is not ready. Download the update first."
- Problem: Integrity/SHA-256 line is developer-security monologue for Settings UI; some messages are formal enough but all are English-only hardcodes.
- Suggested formal: "This update could not be verified. Open the release page or try again later." / "Download the update before installing." Prefer i18n.

### C-EN-26
- Path: `src/desktop/main.ts` ~606–614 (native error box before UI)
- Current: "Cardo failed to start" body with "Typical fixes:" and `npm run desktop:build`, schemaVersion, discovery.json
- Problem: Startup dialog is a developer runbook (acceptable for pre-release debug builds; too technical for shipping end-user installs).
- Suggested formal: Short user message + optional “Copy technical details”. Example: "Cardo could not start. Quit any other Cardo process, reinstall if needed, then try again."

### C-EN-27
- Path: `src/web/i18n/messages.ts` menu vs box casing (~245–259 vs ~250–253)
- Current: "New Page", "New Box", "Delete Box" vs "Pin box", "Lock box position"
- Problem: Title Case / sentence case inconsistency in context menus (polish, not draft).
- Suggested formal: Prefer one menu style throughout, e.g. sentence case: "New page", "New box", "Delete box", "Pin box".

### C-EN-28
- Path: `src/web/app/stores/workspaceStore.ts` ~118
- Current: default title `'Untitled'` hardcoded in `createPage`
- Problem: Bypasses i18n (`page.untitled` exists). With Chinese locale, new pages can still get English "Untitled".
- Suggested formal: Use `translateWebNext(locale, 'page.untitled')` (or Runtime default that respects preferences.locale).

---

## Not flagged (or only note-level)

- Product name on About logo/name is "Cardo" — consistent.
- Extension `runtimeGuide.ts` title/intro/codes generally product-grade (“Start Cardo to continue”, clear Retry steps). CLI mentions only in schema_mismatch path (C-EN-22).
- No user-visible "WebNext", "KhaosBox", "OPFS", "TODO", "WIP", "coming soon", "roadmap", "lorem", or "for now" in scanned UI strings.
- No Chinese characters found inside the `en` locale block of `messages.ts`.
- Code identifiers (`WebNextApp`, `translateWebNext`, comments mentioning OPFS) are not user-facing.

---

## Strings that are already formal (brief)

From `messages.ts` en — representative good set:

- Navigation / pages: Recycle Bin, Favorites, Workspace pages, Default page, delete confirmations with clear Move to Recycle Bin vs Delete Permanently.
- Toolbar / canvas: Search, Settings, New box, Return to origin, Lock/Unlock canvas movement.
- History: Undo, Redo, concise past-tense history labels (Box moved, Item deleted).
- Box / item actions: Rename, Add Item, Pin/Unpin, Lock position, Open item, Copy text / Copied.
- Settings core: Language, Search engine, Appearance, Theme, Color mode, Export/Import workspace, Replace confirmation.
- Runtime banner: "Reconnecting…", "Connection lost. Retrying…" (brief, non-chatty).
- Updates (partially good): "You are on the latest version.", "Version {version} is available.", "Update ready to install.", Install type labels Installed (Setup) / Portable.
- Extension guide (mostly): "Open Cardo on this computer, then try again.", kind codes like "Cardo is not running on this computer."

Theme look preset names (Default, Ocean, Sunset, Forest) are concise product names.

---

## Priority suggestion (for a later copy pass; not done here)

1. High impact user surfaces: About theme system row, Updates descriptions, Runtime feature blurb, error-screen + hostPlatform summaries (C-EN-1–4, C-EN-16–21).
2. Consistency: Collected Items → Favorites vocabulary, menu casing, Untitled i18n (C-EN-9, C-EN-27–28).
3. Theme pack en descriptions and Chrome/shell leftover keys (C-EN-5–6, C-EN-13–15).
4. Desktop update hard-coded English → i18n (C-EN-24–25).

---

## Scan notes

| Area | Finding density |
| --- | --- |
| `messages.ts` en day-to-day UI | Mostly formal |
| Settings About / Updates / features blurbs | Several engineering leaks |
| `components/**` hardcoded English | Little; almost all via `t()` |
| `platform/hostPlatform.ts` | Errors are engineering-facing if shown raw |
| `extension/bootstrap/runtimeGuide.ts` | Mostly good; one CLI-heavy step |
| `error-screen.ts` | Largest developer-monologue surface |
| Built-in theme en descriptions | A few draft/jargon phrases |

End of audit.

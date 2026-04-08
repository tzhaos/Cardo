[中文](./README_zh.md) | [English](./README.md)

<p align="center">
  <img src="./assets/brand/khaosbox-logo-horizontal.svg" alt="KhaosBox logo" width="360" />
</p>

# KhaosBox

KhaosBox is a Manifest V3 browser extension that turns the new tab page into a desktop-like workspace for collecting links, notes, files, and folders inside movable boxes.

## Highlights

- Draggable, resizable, lockable, and minimizable boxes
- List and grid layouts per box
- Support for links, notes, files, and folders
- Drag-and-drop between boxes, plus in-box reordering
- Smart paste for URLs, plain text, Windows paths, UNC paths, and `file://` URIs
- Per-box themes, global light/dark mode, and English/Chinese UI
- JSON import/export for the workspace
- `chrome.storage.local` persistence inside the extension runtime

## Local Resources and KBE

Clicking a file or folder sends a `kbe:` request. On Windows, that request is handled by the bundled KhaosBox Companion app:

- folders open in File Explorer
- files open with their associated desktop application

If the companion is not installed, KhaosBox still sends the request, but Windows will not know how to open it.

## Getting Started

### Prerequisites

- Node.js
- npm
- .NET SDK 9.x on Windows if you want to build or test the companion

### Install dependencies

```bash
npm install
```

### Build the extension

```bash
npm run build
```

This writes the unpacked extension to `artifacts/extension/unpacked`.

### Watch extension builds during development

```bash
npm run dev
```

This runs `vite build --watch` and continuously refreshes `artifacts/extension/unpacked` for an unpacked extension workflow.

### Load as an unpacked extension

1. Run `npm run build`.
2. Open your browser's extension management page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select the repository's [`artifacts/extension/unpacked`](./artifacts/extension/unpacked) folder.

After loading, opening a new tab should show the KhaosBox workspace.

## Root Scripts

For the common Windows workflows, you can use the root PowerShell scripts instead of remembering multiple commands:

### Local build

```powershell
powershell -ExecutionPolicy Bypass -File .\build.ps1
```

This builds:

- the unpacked browser extension into `artifacts/extension/unpacked`
- the Windows companion in local build mode

### Release publish

```powershell
powershell -ExecutionPolicy Bypass -File .\release.ps1
```

This builds the extension and publishes the Windows companion in `Release` mode to:

- `artifacts/companion/windows/publish/win-x64`

### MSI package

```powershell
powershell -ExecutionPolicy Bypass -File .\package.ps1
```

This builds the extension and creates:

- `artifacts/companion/windows/packages/KhaosBoxCompanion-win-x64.msi`

All three root scripts also support optional flags such as `-Clean`, `-RunChecks`, and selective skip flags where appropriate. With `-RunChecks`, `build.ps1` runs **`npm run check`** (TypeScript, architecture guard, ESLint, and TS tests) and then **`dotnet test`** on the Windows companion when it is not skipped.

## Windows Companion

Build the Windows companion:

```bash
npm run companion:windows:build
```

Publish the Windows companion to `artifacts/companion/windows/publish/win-x64`:

```bash
npm run companion:windows:publish
```

Install the companion for the current user:

```bash
npm run companion:windows:install
```

Uninstall it later:

```bash
npm run companion:windows:uninstall
```

Build a Windows `.msi` installer:

```bash
npm run companion:windows:msi
```

That produces `artifacts/companion/windows/packages/KhaosBoxCompanion-win-x64.msi`.

More details live in [`companion/windows/README.md`](./companion/windows/README.md).

## Scripts

| Command                               | Description                                                                      |
| ------------------------------------- | -------------------------------------------------------------------------------- |
| `.\build.ps1`                         | Build the unpacked extension plus the Windows companion local build              |
| `.\release.ps1`                       | Build the unpacked extension plus the Windows companion `Release` publish        |
| `.\package.ps1`                       | Build the unpacked extension and generate the Windows companion MSI              |
| `npm run dev`                         | Watch extension builds into `artifacts/extension/unpacked`                       |
| `npm run build`                       | Build the browser extension into `artifacts/extension/unpacked`                  |
| `npm run companion:windows:build`     | Build the Windows companion project                                              |
| `npm run companion:windows:publish`   | Publish the Windows companion into `artifacts/companion/windows/publish/win-x64` |
| `npm run companion:windows:install`   | Publish and register the Windows companion for the current user                  |
| `npm run companion:windows:uninstall` | Remove the Windows companion registration and installed files                    |
| `npm run companion:windows:msi`       | Build a Windows MSI installer for KhaosBox Companion                             |
| `npm run clean`                       | Remove all generated output and legacy local build leftovers                     |
| `npm run lint`                        | Run `tsc --noEmit` and the architecture dependency guard                         |
| `npm run lint:eslint`                 | Run ESLint with type-aware rules (after `npm install`)                           |
| `npm run format`                      | Format `src/`, `scripts/`, `docs/`, READMEs, and tooling with Prettier           |
| `npm run format:check`                | Verify Prettier formatting (used in CI)                                          |
| `npm run check`                       | `lint` + `lint:eslint` + `test:ts`                                               |
| `npm run test:ts`                     | Run the TypeScript test suite                                                    |
| `npm test`                            | Run the TypeScript and Windows companion tests                                   |

CI runs `npm ci`, `format:check`, `check`, and `dotnet test` via [`.github/workflows/ci.yml`](./.github/workflows/ci.yml).

If `npm install` fails or `lint:eslint` says ESLint is missing, dev dependencies did not install.

Run `npm run doctor:registry` to verify HTTPS access to your configured npm registry (the same class of request `npm install` uses for `@eslint/js`). If that fails, fix proxy/firewall/TLS/registry mirror before chasing other causes.

To read npm’s full debug log after a silent failure:

```powershell
Get-ChildItem "$env:LOCALAPPDATA\npm-cache\_logs" | Sort-Object LastWriteTime -Descending | Select-Object -First 1 | ForEach-Object { Get-Content $_.FullName }
```

If the log shows `fetch manifest` / `cache-miss` then immediate `exit 1`, the registry fetch is failing even when the CLI prints little on screen. Try `npm cache clean --force`, review `npm config get proxy` / `https-proxy`, or switch registry (e.g. a mirror you can reach). Node 22 LTS is a practical fallback if Node 24 + npm 11 misbehaves in your environment.

If `package-lock.json` is stale compared to `package.json`, delete `node_modules` and `package-lock.json`, run `npm install` again once the registry works, and review the lockfile diff before committing.

## Project Structure

```text
.
|-- artifacts/            # All generated output: extension, publish, packages, bin/obj
|-- assets/
|   |-- brand/            # Logos and brand assets
|   `-- extension-shell/  # Manifest, icons, and extension HTML entry points
|-- companion/            # Windows companion app source, scripts, packaging, and docs
|-- scripts/              # Repo-level tooling such as architecture checks and migrations
|-- src/
|   |-- app/              # Stores, ports, use cases, bootstrap, and migrations
|   |-- domains/          # Pure models, reducers, selectors, and codecs
|   |-- extension/        # Browser-extension adapters for clipboard, files, tabs, runtime, and storage
|   |-- features/         # React controllers for box management, item management, tray, and desktop events
|   |-- integrations/     # External integration adapters such as the Windows companion
|   `-- widgets/          # Pure presentational UI building blocks
`-- vite.config.ts        # Extension build configuration
```

## Architecture Notes

A maintained layer diagram and workflow for ports, persistence, and CI live in [`docs/architecture.md`](./docs/architecture.md).

- `src/domains` owns the pure application core: workspace models, the `reduceWorkspace(...)` reducer, selectors, import/export codecs, item parsing, and preferences primitives.
- `src/app` owns orchestration: Zustand stores, runtime ports, and use cases such as opening items, importing/exporting workspaces, clipboard reads, and box creation.
- `assets/extension-shell` owns the browser extension shell inputs that get copied into the unpacked extension.
- `assets/brand` owns reusable branding assets and stays separate from extension packaging inputs.
- `src/extension` owns browser-specific adapter implementations such as tabs, clipboard, runtime document access, file import/export, and Chrome storage.
- `src/integrations/companion` owns the `kbe:` boundary used to ask Windows to open local files and folders.
- `src/features` contains the React control layer. It translates user interactions into app use cases or workspace commands.
- `src/widgets` is intentionally presentation-only. Widgets receive prepared state and callbacks instead of reaching into stores directly.
- Extension locale files are generated at build time from the app message catalog in `src/domains/i18n/model/messages.ts`.
- The persisted workspace format is `WorkspaceSnapshotV3`; export/import uses `WorkspaceExportDocumentV2`.

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

| Command | Description |
| --- | --- |
| `npm run dev` | Watch extension builds into `artifacts/extension/unpacked` |
| `npm run build` | Build the browser extension into `artifacts/extension/unpacked` |
| `npm run companion:windows:build` | Build the Windows companion project |
| `npm run companion:windows:publish` | Publish the Windows companion into `artifacts/companion/windows/publish/win-x64` |
| `npm run companion:windows:install` | Publish and register the Windows companion for the current user |
| `npm run companion:windows:uninstall` | Remove the Windows companion registration and installed files |
| `npm run companion:windows:msi` | Build a Windows MSI installer for KhaosBox Companion |
| `npm run clean` | Remove all generated output and legacy local build leftovers |
| `npm run lint` | Run TypeScript type-checking |
| `npm run test:ts` | Run the TypeScript test suite |
| `npm test` | Run the TypeScript and Windows companion tests |

## Project Structure

```text
.
|-- artifacts/            # All generated output: extension, publish, packages, bin/obj
|-- assets/
|   |-- brand/            # Logos and brand assets
|   `-- extension-shell/  # Manifest, locales, icons, and extension HTML entry points
|-- companion/            # Windows companion app source, scripts, packaging, and docs
|-- src/
|   |-- app/              # App bootstrap and use cases
|   |-- domains/          # Core models, services, and Zustand stores
|   |-- extension/        # Browser-extension host capabilities
|   |-- features/         # User-facing behaviors such as drag/drop and tray interactions
|   |-- integrations/     # External integrations such as the Windows companion
|   `-- widgets/          # Reusable UI building blocks
`-- vite.config.ts        # Extension build configuration
```

## Architecture Notes

- `src/domains` owns workspace data, item creation, layout logic, import/export, and persisted state.
- `assets/extension-shell` owns the browser extension shell inputs that get copied into the unpacked extension.
- `assets/brand` owns reusable branding assets and stays separate from extension packaging inputs.
- `src/extension` owns browser-extension capabilities such as tabs and storage.
- `src/integrations/companion` owns the `kbe:` protocol request boundary.
- `src/app/use-cases/openItem.ts` is the single entrypoint for opening links, notes, files, and folders.

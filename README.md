[中文](./README_zh.md) | [English](./README.md)

<p align="center">
  <img src="./brand/khaosbox-logo-horizontal.svg" alt="KhaosBox logo" width="360" />
</p>

# KhaosBox

KhaosBox turns the browser new tab page into a desktop-like workspace for collecting links, notes, files, and folders inside movable boxes. It is built for quick capture, lightweight organization, and fast reopening without leaving the browser.

The project ships as a Manifest V3 browser extension and also includes a Vite-powered web preview so the same UI can be developed outside the extension runtime.

## Highlights

- Desktop-style workspace with draggable, resizable, lockable, and minimizable boxes
- List and grid layouts for each box
- Support for links, notes, files, and folders
- Drag-and-drop between boxes, plus in-box reordering with visual drop indicators
- Smart paste behavior that turns URLs, plain text, Windows paths, UNC paths, and `file://` URIs into the right item types
- Pin important items to keep them at the top of a box
- Per-box theme presets, global light/dark mode, and English/Chinese UI toggle
- Import and export workspace data as JSON
- Runtime-aware persistence: `chrome.storage.local` in extension mode and `localStorage` in web preview mode

## Current Behavior

- The default workspace starts with three boxes: `Folders`, `Links`, and `Notes`.
- Clicking a link opens it in the browser.
- Clicking a note copies its content to the clipboard.
- Clicking a file or folder attempts to open it through a custom `kbe:` protocol. With the bundled Windows handler installed, folders open in File Explorer and files open with their associated desktop app.
- Press `Ctrl + \`` to minimize or restore all boxes at once.
- Pasting text creates a URL, note, file, or folder item based on the pasted content. Without an active box, URLs go to `Links` and other pasted content goes to `Notes`.
- The bottom dock lets you create boxes, import/export JSON, switch the app theme, and toggle the UI language.

> [!NOTE]
> File and folder launching still depends on a machine-level handler for the `kbe:` protocol. This repository now includes the Windows handler source, publish scripts, and per-user install/uninstall scripts under `native-host/windows/`.

## Tech Stack

- React 19
- TypeScript 5
- Vite 6
- Tailwind CSS 4
- Zustand for persisted state
- Motion for animations
- Manifest V3 for Chromium-based browsers

## Getting Started

### Prerequisites

- Node.js
- npm

### Install dependencies

```bash
npm install
```

No environment variables are required for the current MVP.

### Run the web preview

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) to work with the preview version of the workspace.

### Build the extension

```bash
npm run build
```

The build outputs are written to `dist/`, including:

- `dist/manifest.json`
- `dist/extension/pages/newtab.html`
- `dist/index.html`
- `dist/_locales/`

### Preview the production build

```bash
npm run preview
```

### Install the KBE handler on Windows

KhaosBox hands local files and folders off through a `kbe:` URI. To make those links work on Windows, build and register the bundled handler for the current user:

```bash
npm run native-host:install
```

This command will:

- publish `native-host/windows/KhaosBoxExplorer.csproj`
- copy the executable into `%LOCALAPPDATA%\\KhaosBox\\KhaosBoxExplorer\\`
- register `HKCU\\Software\\Classes\\kbe`

To remove the handler later:

```bash
npm run native-host:uninstall
```

Detailed options and troubleshooting live in [`native-host/windows/README.md`](./native-host/windows/README.md).

### Build an MSI installer

To generate a standard Windows `.msi` installer:

```bash
npm run native-host:msi
```

That command publishes the app and produces:

- `native-host/windows/release/KhaosBoxExplorer-win-x64.msi`

The MSI installs `KhaosBoxExplorer.exe` into `%LOCALAPPDATA%\\KhaosBox\\KhaosBoxExplorer\\`, registers `HKCU\\Software\\Classes\\kbe`, and adds a normal Windows uninstall entry.

## Load as an Unpacked Extension

1. Run `npm run build`.
2. Open your browser's extension management page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select the repository's [`dist`](./dist) folder.

After loading, opening a new tab should show the KhaosBox workspace.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server on port `3000` |
| `npm run build` | Build the preview pages and extension assets into `dist/` |
| `npm run build:extension` | Alias for the extension build |
| `npm run native-host:build` | Build the Windows `kbe:` protocol handler project |
| `npm run native-host:publish` | Publish the Windows handler into `native-host/windows/build/win-x64/` |
| `npm run native-host:msi` | Build a Windows MSI installer for `KhaosBoxExplorer` |
| `npm run native-host:install` | Publish and register the Windows handler for the current user |
| `npm run native-host:uninstall` | Remove the Windows handler registration and installed files |
| `npm run preview` | Serve the built output locally |
| `npm run clean` | Remove the `dist/` directory |
| `npm run lint` | Run TypeScript type-checking without emitting files |
| `npm test` | Run the current Node-based test suite |

## Project Structure

```text
.
|-- brand/                 # Logos and brand assets
|-- extension/             # Manifest, locales, icons, and extension HTML entry points
|-- native-host/           # Windows kbe handler source, scripts, and build output
|-- src/
|   |-- app/               # App shells and bootstraps
|   |-- domains/           # Core models, services, and Zustand stores
|   |-- features/          # User-facing behaviors such as drag/drop and tray interactions
|   |-- platform/          # Runtime adapters for storage, clipboard, navigation, and native bridge
|   `-- widgets/           # Reusable UI building blocks
|-- index.html             # Web preview entry
|-- vite.config.ts         # Multi-page Vite build for preview + extension pages
`-- dist/                  # Build output
```

## Architecture Notes

KhaosBox keeps UI behavior and runtime concerns separated:

- `src/domains` owns workspace data, item creation, layout logic, import/export, and persisted state.
- `src/features` implements flows like box drag/drop, add-item interactions, tray actions, and global shortcuts.
- `src/platform` switches storage, clipboard, navigation, and local resource launching behavior depending on whether the app is running in an extension or in the standalone web preview.

This split makes it easy to iterate on the UI locally while still shipping the same core app inside the extension shell.

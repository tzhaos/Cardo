[中文](./README_zh.md) | [English](./README.md)

<p align="center">
  <img src="./brand/khaosbox-logo-horizontal.svg" alt="KhaosBox logo" width="360" />
</p>

# KhaosBox

KhaosBox turns the browser new tab page into a desktop-like workspace for collecting links, notes, files, and folders inside movable boxes. It is designed for quick capture, lightweight organization, and fast reopening without leaving your browser flow.

The project ships as a Manifest V3 browser extension and also includes a Vite-powered web preview so the UI can be developed outside the extension runtime.

## Highlights

- Desktop-style workspace with draggable, resizable, lockable, minimizable boxes
- List and grid layouts for each box
- Support for links, notes, files, and folders
- Drag-and-drop between boxes, plus in-box reordering with visual drop indicators
- Smart paste behavior that routes URLs and plain text into the right place
- Pin important items to keep them at the top of a box
- Import and export workspace data as JSON
- Runtime-aware persistence: `chrome.storage.local` in extension mode, `localStorage` in web preview mode

## How It Works

- The default workspace starts with three boxes: `Folders`, `Links`, and `Notes`.
- Clicking a link opens it in the browser.
- Clicking a note copies its content to the clipboard.
- Clicking a file or folder attempts to open it through a custom `localexplorer:` protocol.
- Press `Ctrl + \`` to minimize or restore all boxes at once.
- Pasting text adds a URL to `Links`, plain text to `Notes`, or to the currently active box when one is selected.

> [!NOTE]
> File and folder launching depends on a machine-level handler for the `localexplorer:` protocol. This repository triggers that protocol but does not include the local handler itself.

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

### Preview the production build

```bash
npm run preview
```

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
| `npm run preview` | Serve the built output locally |
| `npm run clean` | Remove the `dist/` directory |
| `npm run lint` | Run TypeScript type-checking without emitting files |

## Project Structure

```text
.
|-- brand/                 # Logos and brand assets
|-- extension/             # Manifest and extension-specific HTML entry points
|-- src/
|   |-- app/               # App shells and bootstraps
|   |-- domains/           # Core models, services, and Zustand stores
|   |-- features/          # User-facing behaviors such as drag/drop and tray interactions
|   |-- platform/          # Runtime adapters for storage, clipboard, navigation, native bridge
|   `-- widgets/           # Reusable UI building blocks
|-- index.html             # Web preview entry
|-- vite.config.ts         # Multi-page Vite build for preview + extension pages
`-- dist/                  # Build output
```

## Architecture Notes

KhaosBox keeps the UI and runtime concerns separated:

- `src/domains` owns workspace data, item creation, layout logic, and persisted state.
- `src/features` implements flows like box drag/drop, add-item interactions, and tray behavior.
- `src/platform` switches storage and launch behavior depending on whether the app is running in a browser extension or in the standalone web preview.

This split makes it easy to iterate on the UI locally while still shipping the same core app inside the extension shell.

# KhaosBox

KhaosBox is a multi-host TypeScript workspace app for organizing links, notes, files, and folders in movable boxes.

## Hosts

- Browser extension: Manifest V3 new tab workspace.
- Desktop: Electron shell reusing the same React experience.
- CLI: Node command line tools for workspace inspection.

## Architecture

```text
src/
|-- core/       # runtime-agnostic domain, codecs, protocols, ports
|-- web/        # React UI, Zustand stores, use-cases, feature controllers
|-- extension/  # MV3 bootstrap, Chrome adapters, background bridge
|-- desktop/    # Electron main, preload, renderer, desktop adapters
|-- native-host/# TS Native Messaging host for local resource opening
`-- cli/        # Node CLI entry
```

The browser extension and Electron desktop both use `src/web` for the UI. Platform capabilities are injected through `src/core/ports`.

## Local resources

Files and folders are opened through the optional Native Messaging host. The browser extension sends `open-local-resource` messages to `com.khaosbox.local_bridge`; the host opens local paths with the operating system file manager. The Electron desktop app opens local resources through its own preload IPC bridge.

## Install

```bash
npm install
```

## Development scripts

| Command                         | Description                                                      |
| ------------------------------- | ---------------------------------------------------------------- |
| `npm run dev`                   | Watch extension builds into `artifacts/extension/unpacked`       |
| `npm run build`                 | Build the browser extension                                      |
| `npm run desktop:build`         | Build Electron renderer, main, and preload artifacts             |
| `npm run desktop:start`         | Build and start the Electron desktop app                         |
| `npm run native-host:build`     | Build the Native Messaging host exe into `artifacts/native-host` |
| `npm run native-host:install`   | Register the host for Chrome and Edge                            |
| `npm run native-host:uninstall` | Unregister the Native Messaging host                             |
| `npm run cli -- --help`         | Show CLI commands                                                |
| `npm run test:ts`               | Run TypeScript tests                                             |
| `npm run check`                 | Run TypeScript, architecture, ESLint, and tests                  |
| `npm run clean`                 | Remove generated artifacts                                       |

## CLI

```bash
npm run cli -- inspect workspace.export-v3.json
```

## Browser extension

```bash
npm run build
```

Load `artifacts/extension/unpacked` as an unpacked extension in Chrome or Edge.

## Desktop

```bash
npm run desktop:start
```

Build output is written to `artifacts/desktop`.

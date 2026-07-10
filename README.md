# KhaosBox

KhaosBox is a multi-host TypeScript spatial workbench for organizing links, notes, files, folders, website bookmarks, and quick-launch collections in freeform template boxes.

## Hosts

- Browser extension: Manifest V3 new tab workspace.
- Desktop: Electron shell reusing the same React experience.
- CLI: Node command line tools for workspace inspection.

## Architecture

```text
src/
|-- core/       # runtime-agnostic domain, codecs, protocols, ports
|-- web-next/   # React UI, spatial workspace domain, platform integration
|-- extension/  # MV3 bootstrap, Chrome adapters, background bridge
|-- desktop/    # Electron main, preload, renderer, desktop adapters
|-- native-host/# TS Native Messaging host for local resource opening
`-- cli/        # Node CLI entry
```

The browser extension and Electron desktop both use `src/web-next`. Platform capabilities are injected through `src/core/ports`; the CLI can inspect both legacy exports and web-next persisted workspace snapshots.

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
npm run cli -- inspect workspace.json
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

## CI and releases

GitHub Actions runs formatting, static checks, tests, and builds the browser extension, desktop
application, and Native Messaging host for pushes and pull requests targeting `main`.

To publish a Windows release, push a stable semantic-version tag:

```powershell
git tag v0.1.0
git push origin v0.1.0
```

The release workflow builds and publishes the extension archive, Native Messaging host, desktop
installer, portable executable, and SHA-256 checksums to the matching GitHub Release.

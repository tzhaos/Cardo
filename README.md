# KhaosBox

KhaosBox is a multi-host TypeScript workspace app for organizing links, notes, files, and folders in movable boxes.

## Hosts

- Browser extension: Manifest V3 new tab workspace.
- Desktop: Electron shell reusing the same React experience.
- CLI: Node command line tools for workspace migration and inspection.

## Architecture

```text
src/
|-- core/       # runtime-agnostic domain, codecs, migrations, protocols, ports
|-- web/        # React UI, Zustand stores, use-cases, feature controllers
|-- extension/  # MV3 bootstrap, Chrome adapters, background bridge
|-- desktop/    # Electron main, preload, renderer, desktop adapters
`-- cli/        # Node CLI entry
```

The browser extension and Electron desktop both use `src/web` for the UI. Platform capabilities are injected through `src/core/ports`.

## Local resources

Files and folders use the `kbe:` protocol. The extension emits `kbe:` URLs, and the Electron desktop app registers as the protocol handler and opens local paths through Electron's shell API.

## Install

```bash
npm install
```

## Development scripts

| Command                 | Description                                                |
| ----------------------- | ---------------------------------------------------------- |
| `npm run dev`           | Watch extension builds into `artifacts/extension/unpacked` |
| `npm run build`         | Build the browser extension                                |
| `npm run desktop:build` | Build Electron renderer, main, and preload artifacts       |
| `npm run desktop:start` | Build and start the Electron desktop app                   |
| `npm run cli -- --help` | Show CLI commands                                          |
| `npm run test:ts`       | Run TypeScript tests                                       |
| `npm run check`         | Run TypeScript, architecture, ESLint, and tests            |
| `npm run clean`         | Remove generated artifacts                                 |

## CLI

```bash
npm run cli -- migrate workspace.json
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

## Documentation

See [`docs/architecture.md`](./docs/architecture.md).

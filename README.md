# Cardo

Cardo is a multi-host TypeScript spatial workbench for organizing links, notes, files, folders, website bookmarks, and quick-launch collections in freeform template boxes.

Product direction is Cardo: one local Runtime holds SQLite and business writes; Web, Desktop, and the browser extension are clients of that Runtime. See `docs/architecture/local-runtime-multi-client.md`.

## Hosts

- Cardo Runtime: sole workspace authority (CLI `cardo serve` / `cardo open`, or Desktop embed).
- Web UI: served by Runtime at `/app/` (open via `cardo open`).
- Browser extension: Manifest V3 client; toolbar opens the extension page, discovers Runtime via Native Messaging.
- Desktop: Electron shell; attach-first, embed-if-missing; same RuntimeClient path as Web.

## Architecture

```text
src/
|-- core/       # domain, contracts, Command/Query/History, migrator
|-- runtime/    # Cardo Runtime HTTP server, lock, discovery, events
|-- client/     # RuntimeClient (HTTP + fetch stream)
|-- cli/        # cardo serve / open / status / stop
|-- web-next/   # React UI, spatial workspace domain, platform integration
|-- extension/  # MV3 bootstrap, Chrome adapters, Runtime discover
|-- desktop/    # Electron main, preload, renderer, attach/embed
`-- native-host/# thin Native Messaging host (discover + optional relay)
```

All graphical surfaces use `src/web-next` and talk to Runtime through `RuntimeClient`. Non-DB shell ports stay in `src/core/ports`.

## Cardo CLI

Build CLI + hosted Web UI:

```bash
npm run cardo:build
```

Everyday commands (after build; bin is `cardo`):

```bash
# Ensure Runtime is up and open the Web UI (one-time code bootstrap; no long-lived token in URL)
npm run cardo -- open
# or: node artifacts/cli/cardo.js open

# Foreground Runtime (blocks until Ctrl+C or cardo stop)
npm run cardo -- serve

# Health / diagnostics
npm run cardo -- status

# Force stop
npm run cardo -- stop
```

`cardo open` spawns a detached Runtime when none is healthy, then opens the browser. Active page and the global undo stack are shared across every connected client.

## Local resources and Native Messaging

The extension discovers Runtime through a thin Native Messaging host (`npm run native-host:install` for Chrome/Edge, or Desktop install). Local paths open via Runtime capability (not a second SQLite writer).

## Install

```bash
npm install
```

## Development scripts

| Command                         | Description                                                      |
| ------------------------------- | ---------------------------------------------------------------- |
| `npm run dev`                   | Watch extension builds into `artifacts/extension/unpacked`       |
| `npm run build`                 | Build the browser extension                                      |
| `npm run cardo:build`           | Build CLI (`artifacts/cli/cardo.js`) and Runtime-hosted Web UI   |
| `npm run cardo -- open`         | Ensure Runtime + open Web UI                                     |
| `npm run cardo -- serve`        | Foreground Cardo Runtime                                         |
| `npm run desktop:build`         | Build web-runtime, Electron renderer, main, and preload          |
| `npm run desktop:start`         | Build and start the Electron desktop app                         |
| `npm run native-host:build`     | Build the Native Messaging host exe into `artifacts/native-host` |
| `npm run native-host:install`   | Register the host for Chrome and Edge                            |
| `npm run native-host:uninstall` | Unregister the Native Messaging host                             |
| `npm run test:ts`               | Run TypeScript tests                                             |
| `npm run check`                 | Run TypeScript, architecture, ESLint, and tests                  |
| `npm run clean`                 | Remove generated artifacts                                       |

## Browser extension

```bash
npm run build
npm run native-host:install
npm run cardo -- open
```

Load `artifacts/extension/unpacked` as an unpacked extension in Chrome or Edge. Open the toolbar action for the extension page (v1 primary shell). Runtime must be running and the native host registered.

## Desktop

```bash
npm run desktop:start
```

Build output is written to `artifacts/desktop`. If Runtime is already up (for example after `cardo serve`), Desktop attaches; otherwise Main embeds Runtime for the same database path.

## CI and releases

GitHub Actions runs formatting, static checks, tests, and a full product compile (`build:all`) for
pushes and pull requests targeting `main`.

To publish a Windows Desktop release, push a stable semantic-version tag:

```powershell
git tag v0.1.0
git push origin v0.1.0
```

The release workflow packages Desktop only (NSIS installer, portable exe, SHA-256 checksums) and
uploads them to the matching GitHub Release. CLI and other clients are expected to ship via npm
later.

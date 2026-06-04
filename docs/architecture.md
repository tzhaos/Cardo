# KhaosBox architecture

KhaosBox is now organized as a multi-host TypeScript codebase. The same core and React experience are shared by the browser extension, Electron desktop shell, and CLI.

## Layer model

| Layer           | Path                 | Responsibility                                                                  |
| --------------- | -------------------- | ------------------------------------------------------------------------------- |
| **Core**        | `src/core/**`        | Runtime-agnostic domain model, reducers, codecs, migrations, protocols, ports.  |
| **Web**         | `src/web/**`         | React UI, Zustand stores, feature hooks, use-cases, and presentation wiring.    |
| **Extension**   | `src/extension/**`   | Manifest V3 shell, Chrome adapters, extension bootstrap, and background bridge. |
| **Desktop**     | `src/desktop/**`     | Electron main/preload/renderer host and desktop adapters.                       |
| **Native Host** | `src/native-host/**` | TypeScript Native Messaging host for local resource opening.                    |
| **CLI**         | `src/cli/**`         | Node command line entry points built on core.                                   |

Dependency direction:

```text
core <- web <- extension/bootstrap
core <- extension/adapters
core <- desktop/renderer <- web
core <- desktop/main,preload,adapters
core <- native-host
core <- cli
```

`web` must not import `extension`, `desktop`, or `cli`. `desktop/renderer.tsx` is the only desktop module that may host the web app. CLI code depends on core only. Host-specific capabilities are injected through `AppPorts`.

## Ports

- Port interfaces live in `src/core/ports`.
- `src/web/app/ports/defaultPorts.ts` exposes stable proxy objects and `configureAppPorts(...)`.
- `src/extension/ports/createExtensionPorts.ts` wires Chrome storage, tabs, clipboard, file import/export, and Native Messaging local resource requests.
- `src/desktop/ports/createDesktopPorts.ts` wires Electron preload bridge capabilities.
- `src/native-host/main.ts` implements the Chrome Native Messaging stdio host.
- WebDAV is a host capability. The web layer calls `WebDavPort`; extension and desktop provide their own transport adapters.

## Core Services

Pure application operations live in `src/core/services`. These services accept explicit dependencies such as snapshots, dispatch functions, id factories, and ports. They do not read Zustand stores or platform singletons.

The web layer may expose compatibility wrappers for UI call sites, but business decisions such as item opening, workspace export/import, paste target selection, and box creation belong in core services.

## Web feature boundaries

Feature UI modules under `src/web/features/*/ui` are layout and control surfaces. They should consume local feature hooks/controllers for state and actions. Direct imports from app stores, app use-cases, or `sonner` belong in feature hooks/controllers or app presentation modules, not in UI components. App ports stay behind app controllers or app use-cases; feature modules do not import `src/web/app/ports` directly.

Web app use-cases are host-agnostic orchestration wrappers around core services, Zustand stores, and injected app ports. Pure document building, parsing, validation, and migration logic belongs in `src/core`.

## Local resources

Local file and folder opening is an explicit host capability.

- The extension sends Native Messaging requests to `com.khaosbox.local_bridge`.
- The Native Messaging host reads Chrome's length-prefixed stdio protocol and opens paths with the operating system file manager.
- Electron opens local resources through preload IPC and `shell.openPath`.
- The previous C# companion and custom `kbe:` protocol path have been removed.

## Entry points

- Extension new tab: `src/extension/bootstrap/newtab.tsx`
- Electron renderer: `src/desktop/renderer.tsx`
- Electron main: `src/desktop/main.ts`
- Electron preload: `src/desktop/preload.ts`
- Native Messaging host: `src/native-host/main.ts`
- CLI: `src/cli/main.ts`

## Quality gates

- `npm run lint`: `tsc --noEmit` plus `scripts/check-architecture.ts`
- `npm run lint:eslint`: ESLint
- `npm run test:ts`: TypeScript tests
- `npm run check`: lint, ESLint, and tests
- `npm run build`: browser extension build
- `npm run desktop:build`: Electron renderer/main/preload build
- `npm run native-host:build`: Native Messaging host executable build
- `npm run native-host:install`: host manifest and registry install for Chrome/Edge
- `npm run native-host:uninstall`: remove Chrome/Edge native host registry entries

The architecture guard enforces the core/web/host boundaries for static and dynamic imports, blocks feature-level direct toast calls, keeps the settings shell thin, and blocks legacy top-level `src/app`, `src/domains`, `src/features`, `src/widgets`, `src/lib`, and `src/integrations` directories. It also blocks restoring the previous `companion/windows` implementation and prevents `kbe:` protocol code from returning.

# KhaosBox architecture

This document is the canonical map of how the browser extension is structured. The Windows Companion is a separate .NET program; integration happens only through the `kbe:` URL scheme and shared parsing assumptions (see tests on both sides).

## Layer model

| Layer                 | Path                  | Rules                                                                                                                                                                                                                                                       |
| --------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Domain**            | `src/domains/**`      | Pure TypeScript: no React, no Zustand, no `window` / `document` / `chrome` in production source (tests may use Node-only APIs; the architecture script skips `*.test.ts` for the global scan).                                                              |
| **Application**       | `src/app/**`          | Composition: Zustand stores, use-cases, React hooks, **ports** (interfaces) and **default port wiring**.                                                                                                                                                    |
| **Features**          | `src/features/**`     | Vertical slices (UI + feature hooks) that call use-cases and stores. Each feature has an **`index.ts`** barrel: import `../features/<name>` from app or sibling features—**not** `../features/<name>/ui/...` (enforced by `scripts/check-architecture.ts`). |
| **Widgets**           | `src/widgets/**`      | Presentational components; must not import stores, toasts, or extension/companion adapters.                                                                                                                                                                 |
| **Extension runtime** | `src/extension/**`    | Chrome APIs and DOM: storage, clipboard, tabs, files, theme.                                                                                                                                                                                                |
| **Integrations**      | `src/integrations/**` | Companion and other bridges.                                                                                                                                                                                                                                |

Dependency direction: **domains ← app ← features/widgets**, with **extension** and **integrations** consumed from **app** (via ports), not from domains.

## Hooks and use-cases

- **Use-cases** (`src/app/use-cases/`) orchestrate ports, stores, and domain services. User-visible outcomes are described as **`ToastSpec`** (message key, optional params, and a level such as success / message / error / plain). Nested i18n uses `{ i18nKey: MessageKey }` inside `params`; resolution happens in one place.
- **Presentation** (`src/app/presentation/`) maps specs to the actual toast library via **`presentToastSpec(t, spec, sink?)`**. Production passes the default **Sonner** sink; tests can stub `sink` or test **`resolveToastParamValues`** without the DOM.
- **Feature hooks** keep **UI wiring only**: React state, DOM/React events, store subscriptions, and **`presentToastSpec(t, …)`** after calling use-cases. UI components (including settings) do not construct ad-hoc success/error branches around `toast.*`—they run a flow use-case and present the returned `ToastSpec`.

## Ports and dependency injection

- **`AppPorts`** (`src/app/ports/createBrowserExtensionPorts.ts`) is the typed bundle of all side-effect adapters.
- **`createBrowserExtensionPorts()`** builds the production implementation (Chrome + companion).
- **`appPorts`** / **`defaultPorts.ts`** exports the extension singleton plus flat `*Port` exports for existing call sites.
- **Tests** can call `createBrowserExtensionPorts()` and stub individual surfaces without touching globals, or mock modules that read `defaultPorts`.

## State and persistence

- **`createWorkspaceStore(storage)`** / **`createPreferencesStore(storage)`** build Zustand stores with an injectable **`WorkspaceStoragePort`**; production uses **`useWorkspaceStore`** / **`usePreferencesStore`** from **`defaultPorts`**. Tests can construct an isolated store with a fake `StateStorage`.
- **Workspace** persists a `WorkspaceSnapshotV3` partial via `zustand/persist`. Persist middleware **version `1`** is reserved for future envelope migrations; **`migrate`** currently passes the partial through (the workspace schema itself uses `schemaVersion: 3` inside the snapshot).
- **Preferences** uses the same `chrome.storage.local` adapter with a separate persist key and persist **version `1`**.
- Invalid or legacy JSON is handled in **`merge`** / `parseWorkspaceSnapshot`; see **`src/app/migrations/workspaceMigration.ts`** for file import paths.

## TypeScript config

- **`tsconfig.base.json`** holds shared compiler options; **`tsconfig.json`** extends it and includes **`src`**, **`vite.config.ts`**, and **`scripts/**/\*.ts`** for a single `tsc --noEmit` used by **`npm run lint`\*\*.

## Quality gates

- **`npm run lint`**: `tsc --noEmit` + `scripts/check-architecture.ts`.
- **`npm run lint:eslint`**: ESLint (type-checked rules); run after `npm install`.
- **`npm run format:check`**: Prettier.
- **`npm run check`**: lint + ESLint + `npm run test:ts`.
- **`npm run test`**: TypeScript tests + .NET companion tests.
- **GitHub Actions** (`.github/workflows/ci.yml`): `npm ci`, `format:check`, `check`, and `dotnet test` on the companion project.
- **PowerShell**: `build.ps1 -RunChecks` / `package.ps1 -RunChecks` run `npm run check` then companion **`dotnet test`** (when the companion is not skipped).

## Adding a new capability

1. Define a **port interface** under `src/app/ports/`.
2. Implement it under `src/extension/**` or `src/integrations/**`.
3. Add the implementation to **`createBrowserExtensionPorts`** and **`AppPorts`**.
4. Call it from a **use-case** in `src/app/use-cases/`, not from a domain module.
5. Add unit tests in **domains** (pure logic) or beside the adapter (integration-style).

/**
 * Dual-mode hostPlatform facade (design §6.16).
 *
 * - mode=local: createDatabaseClient(AppPorts.database) — Desktop/Extension default (PR3)
 * - mode=runtime: RuntimeClient HTTP + fetch stream — Runtime-hosted Web default (PR3)
 *
 * Local DatabasePort path is intentionally preserved until PR6.
 */

import { getAppPorts } from '../../core/runtime/appPorts';
import { createDatabaseClient, type KhaosDatabase } from '../../core/database/createDatabaseClient';
import { executeDatabaseCommand } from '../../core/application/executeDatabaseCommand';
import type { WorkspaceCommand } from '../../core/contracts/workspaceCommands';
import {
  getDatabaseHistoryState,
  redoDatabaseCommand,
  undoDatabaseCommand,
} from '../../core/application/historyEngine';
import {
  getBoxItems,
  getPageBoxes,
  getPageTabs,
  getPreferences,
  getWorkspaceProjection,
  getWorkspaceState,
} from '../../core/database/workspaceQueries';
import { searchWorkspaceDatabase } from '../../core/database/globalSearchQuery';
import {
  getOperationLogEntries,
  recordDatabaseActivity,
  type ActivityLogInput,
} from '../../core/application/operationLogService';
import {
  WORKSPACE_TRANSFER_VERSION,
  workspaceTransferDocumentSchema,
} from '../../core/contracts/workspaceTransfer';
import {
  initializeWorkspaceDatabase,
  type InitialWorkspacePreferences,
} from '../../core/database/initializeWorkspaceDatabase';
import type { InvalidationScope } from '../../core/contracts/runtimeProtocol';
import {
  exchangeOneTimeCode,
  RuntimeClient,
  type RuntimeClientKind,
} from '../../client/runtimeClient';

export type HostPlatformMode = 'local' | 'runtime';

export interface CardoRuntimeInjection {
  baseUrl: string;
  token: string;
  client?: RuntimeClientKind;
}

declare global {
  interface Window {
    __CARDO_RUNTIME__?: CardoRuntimeInjection;
    /** Optional override: '0' forces local, '1' prefers runtime when injection/code available. */
    __CARDO_USE_RUNTIME__?: string;
  }
}

let mode: HostPlatformMode = 'local';
let modeLocked = false;
let runtimeClient: RuntimeClient | null = null;
let database: KhaosDatabase | null = null;
let databaseTaskQueue: Promise<unknown> = Promise.resolve();
/** Re-entrancy depth so applyScopes queries can run inside an active command task. */
let databaseTaskDepth = 0;
let ensureReadyPromise: Promise<void> | null = null;

/** Explicit mode selection (call before ensureHostPlatformReady). */
export function setHostPlatformMode(next: HostPlatformMode): void {
  if (modeLocked && mode !== next) {
    throw new Error(`hostPlatform mode already locked to ${mode}`);
  }
  mode = next;
}

export function getHostPlatformMode(): HostPlatformMode {
  return mode;
}

export function getRuntimeClient(): RuntimeClient | null {
  return runtimeClient;
}

/**
 * Resolve dual-mode bootstrap once:
 * - injected window.__CARDO_RUNTIME__ (baseUrl+token)
 * - ?code= one-time exchange (same-origin Runtime-hosted Web)
 * - CARDO_USE_RUNTIME / __CARDO_USE_RUNTIME__ gate
 * - default local for Desktop/Extension shells that never inject
 */
export function ensureHostPlatformReady(): Promise<void> {
  ensureReadyPromise ??= resolveHostPlatformMode();
  return ensureReadyPromise;
}

async function resolveHostPlatformMode(): Promise<void> {
  if (modeLocked) return;

  const forceLocal = readUseRuntimeFlag() === '0';
  const forceRuntime = readUseRuntimeFlag() === '1';

  if (forceLocal) {
    mode = 'local';
    modeLocked = true;
    return;
  }

  const injection = readRuntimeInjection();
  if (injection) {
    await startRuntimeMode(injection.baseUrl, injection.token, injection.client ?? 'web');
    return;
  }

  const code = readBootstrapCodeFromLocation();
  if (code) {
    const baseUrl = window.location.origin;
    const exchanged = await exchangeOneTimeCode(baseUrl, code);
    stripCodeFromUrl();
    // Keep token in memory only (sessionStorage optional; design allows either).
    try {
      sessionStorage.setItem('cardo.runtime.token', exchanged.token);
    } catch {
      // private mode etc.
    }
    await startRuntimeMode(baseUrl, exchanged.token, 'web');
    return;
  }

  // Same-origin hosted page may already have exchanged token in sessionStorage.
  const sessionToken = readSessionToken();
  if (sessionToken && isLikelyRuntimeHostedPage()) {
    await startRuntimeMode(window.location.origin, sessionToken, 'web');
    return;
  }

  if (forceRuntime && isLikelyRuntimeHostedPage()) {
    throw new Error(
      'Runtime mode requested but no token. Open via `cardo open` (one-time code bootstrap).',
    );
  }

  // Desktop renderer / Extension default — local DatabasePort path.
  mode = 'local';
  modeLocked = true;
}

async function startRuntimeMode(
  baseUrl: string,
  token: string,
  client: RuntimeClientKind,
): Promise<void> {
  mode = 'runtime';
  const clientInstance = new RuntimeClient({
    baseUrl,
    token,
    client,
    clientVersion: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0',
    onApplyScopes: applyRuntimeScopes,
  });
  await clientInstance.connect();
  runtimeClient = clientInstance;
  modeLocked = true;

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => {
      void clientInstance.close();
    });
  }
}

/**
 * Apply InvalidationScope list via typed queries into stores (design §6.9.2).
 * Lazy-imports stores to avoid circular dependencies with hostPlatform.
 */
export async function applyRuntimeScopes(scopes: InvalidationScope[]): Promise<void> {
  if (!scopes.length) return;
  const [{ applyWorkspaceInvalidationScopes }, { applyPreferencesInvalidationScopes }] =
    await Promise.all([
      import('../app/stores/workspaceStore'),
      import('../app/stores/preferencesStore'),
    ]);
  await applyWorkspaceInvalidationScopes(scopes);
  await applyPreferencesInvalidationScopes(scopes);
}

function getKhaosDatabase() {
  if (mode === 'runtime') {
    throw new Error('Local DatabasePort is not used in runtime mode.');
  }
  database ??= createDatabaseClient(getAppPorts().database);
  return database;
}

function requireRuntimeClient(): RuntimeClient {
  if (!runtimeClient) {
    throw new Error('RuntimeClient is not connected.');
  }
  return runtimeClient;
}

export function initializeWorkspace(initialPreferences: InitialWorkspacePreferences) {
  return runDatabaseTask(async () => {
    if (mode === 'runtime') {
      await requireRuntimeClient().ensureInitialized(initialPreferences);
      return;
    }
    await initializeWorkspaceDatabase(getKhaosDatabase(), initialPreferences);
  });
}

export function dispatchDatabaseCommand(command: WorkspaceCommand) {
  return runDatabaseTask(async () => {
    if (mode === 'runtime') {
      // Scopes applied inside RuntimeClient from command.ok (initiator path).
      return await requireRuntimeClient().dispatchCommand(command);
    }
    const execution = await executeDatabaseCommand(getKhaosDatabase(), command);
    return execution.result;
  });
}

export function undoDatabaseHistory() {
  return runDatabaseTask(async () => {
    if (mode === 'runtime') {
      const ok = await requireRuntimeClient().historyUndo();
      return ok.applied;
    }
    const execution = await undoDatabaseCommand(getKhaosDatabase());
    return execution.applied;
  });
}

export function redoDatabaseHistory() {
  return runDatabaseTask(async () => {
    if (mode === 'runtime') {
      const ok = await requireRuntimeClient().historyRedo();
      return ok.applied;
    }
    const execution = await redoDatabaseCommand(getKhaosDatabase());
    return execution.applied;
  });
}

export function queryDatabaseHistoryState() {
  return runDatabaseTask(async () => {
    if (mode === 'runtime') {
      return await requireRuntimeClient().queryHistoryState();
    }
    return getDatabaseHistoryState(getKhaosDatabase());
  });
}

export function queryWorkspaceProjection() {
  return runDatabaseTask(async () => {
    if (mode === 'runtime') {
      return await requireRuntimeClient().queryWorkspaceProjection();
    }
    return getWorkspaceProjection(getKhaosDatabase());
  });
}

export function queryWorkspaceState() {
  return runDatabaseTask(async () => {
    if (mode === 'runtime') {
      return await requireRuntimeClient().queryWorkspaceState();
    }
    return getWorkspaceState(getKhaosDatabase());
  });
}

export function queryPageTabs() {
  return runDatabaseTask(async () => {
    if (mode === 'runtime') {
      return await requireRuntimeClient().queryPageTabs();
    }
    return getPageTabs(getKhaosDatabase());
  });
}

export function queryPageBoxes(pageId: string) {
  return runDatabaseTask(async () => {
    if (mode === 'runtime') {
      return await requireRuntimeClient().queryPageBoxes(pageId);
    }
    return getPageBoxes(getKhaosDatabase(), pageId);
  });
}

export function queryBoxItems(boxId: string) {
  return runDatabaseTask(async () => {
    if (mode === 'runtime') {
      return await requireRuntimeClient().queryBoxItems(boxId);
    }
    return getBoxItems(getKhaosDatabase(), boxId);
  });
}

export function recordActivity(input: ActivityLogInput) {
  void runDatabaseTask(async () => {
    if (mode === 'runtime') {
      await requireRuntimeClient().activityRecord(input);
      return;
    }
    await recordDatabaseActivity(getKhaosDatabase(), input);
  }).catch((error: unknown) => console.error('Failed to record activity', error));
}

export async function exportOperationLog() {
  await runDatabaseTask(async () => {
    if (mode === 'runtime') {
      const exported = await requireRuntimeClient().exportOperationLog();
      const exportedAt = new Date().toISOString();
      getAppPorts().fileExport.downloadJson(
        `khaosbox-operation-log-${exportedAt.slice(0, 10)}.json`,
        JSON.stringify(
          {
            format: 'khaosbox-operation-log',
            version: 1,
            exportedAt,
            entries: exported.entries,
          },
          null,
          2,
        ),
      );
      await requireRuntimeClient().activityRecord({
        action: 'journal.export',
        details: { eventCount: exported.entries.length },
      });
      return;
    }

    const entries = await getOperationLogEntries(getKhaosDatabase());
    const exportedAt = new Date().toISOString();
    getAppPorts().fileExport.downloadJson(
      `khaosbox-operation-log-${exportedAt.slice(0, 10)}.json`,
      JSON.stringify(
        {
          format: 'khaosbox-operation-log',
          version: 1,
          exportedAt,
          entries,
        },
        null,
        2,
      ),
    );
    await recordDatabaseActivity(getKhaosDatabase(), {
      action: 'journal.export',
      details: { eventCount: entries.length },
    });
  });
}

export async function exportWorkspaceData() {
  await runDatabaseTask(async () => {
    if (mode === 'runtime') {
      const exported = await requireRuntimeClient().exportWorkspace();
      const document = exported.document;
      getAppPorts().fileExport.downloadJson(
        `khaosbox-${document.exportedAt.slice(0, 10)}.json`,
        JSON.stringify(document, null, 2),
      );
      await requireRuntimeClient().activityRecord({
        action: 'workspace.export',
        details: {
          pageCount: document.workspace.pages.length,
          boxCount: document.workspace.boxes.length,
          itemCount: new Set(
            document.workspace.boxes.flatMap((box) => box.items.map((item) => item.id)),
          ).size,
        },
      });
      return;
    }

    const workspace = await getWorkspaceProjection(getKhaosDatabase());
    const exportedAt = new Date().toISOString();
    const document = workspaceTransferDocumentSchema.parse({
      format: 'khaosbox-workspace',
      version: WORKSPACE_TRANSFER_VERSION,
      exportedAt,
      workspace,
    });
    getAppPorts().fileExport.downloadJson(
      `khaosbox-${exportedAt.slice(0, 10)}.json`,
      JSON.stringify(document, null, 2),
    );
    await recordDatabaseActivity(getKhaosDatabase(), {
      action: 'workspace.export',
      details: {
        pageCount: workspace.pages.length,
        boxCount: workspace.boxes.length,
        itemCount: new Set(workspace.boxes.flatMap((box) => box.items.map((item) => item.id)))
          .size,
      },
    });
  });
}

export async function parseWorkspaceImportFile(file: File) {
  const document = workspaceTransferDocumentSchema.parse(JSON.parse(await file.text()));
  return {
    fileName: file.name,
    workspace: document.workspace,
  };
}

export function queryPreferences() {
  return runDatabaseTask(async () => {
    if (mode === 'runtime') {
      return await requireRuntimeClient().queryPreferences();
    }
    return getPreferences(getKhaosDatabase());
  });
}

export function queryGlobalSearch(query: string) {
  return runDatabaseTask(async () => {
    if (mode === 'runtime') {
      return await requireRuntimeClient().queryGlobalSearch(query);
    }
    return searchWorkspaceDatabase(getKhaosDatabase(), query);
  });
}

function runDatabaseTask<T>(task: () => Promise<T>): Promise<T> {
  // Nested calls (e.g. scope re-query inside command.ok apply) must not wait on the outer task.
  if (databaseTaskDepth > 0) {
    databaseTaskDepth += 1;
    return task().finally(() => {
      databaseTaskDepth -= 1;
    });
  }

  const run = async () => {
    databaseTaskDepth += 1;
    try {
      return await task();
    } finally {
      databaseTaskDepth -= 1;
    }
  };

  const result = databaseTaskQueue.then(run, run);
  databaseTaskQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

/**
 * The only platform boundary used by web-next. Entries configure the shared
 * core ports before rendering, so the same UI can use Chrome or Electron.
 */
export function openExternalUrl(url: string) {
  getAppPorts().tabs.openUrl(url);
}

export async function openLocalResource(path: string) {
  if (mode === 'runtime') {
    const opened = await requireRuntimeClient().openLocalResource(path);
    return opened
      ? ({ status: 'requested' } as const)
      : ({ status: 'failed', errorMessage: 'Runtime could not open the local resource.' } as const);
  }
  return await getAppPorts().localResource.requestOpen(path);
}

export async function writeClipboardText(text: string) {
  await getAppPorts().clipboard.writeText(text);
}

const websiteIconRequests = new Map<string, Promise<string | null>>();

export function resolveWebsiteIcon(url: string) {
  const cached = websiteIconRequests.get(url);
  if (cached) return cached;
  const request = getAppPorts()
    .websiteIcons.resolve(url)
    .catch(() => null);
  websiteIconRequests.set(url, request);
  return request;
}

// --- bootstrap helpers ---

function readUseRuntimeFlag(): '0' | '1' | null {
  if (typeof window !== 'undefined') {
    const fromWindow = window.__CARDO_USE_RUNTIME__;
    if (fromWindow === '0' || fromWindow === '1') return fromWindow;
  }
  try {
    // Vite / build-time inject (optional).
    const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
    const value = env?.CARDO_USE_RUNTIME ?? env?.VITE_CARDO_USE_RUNTIME;
    if (value === '0' || value === '1') return value;
  } catch {
    // ignore
  }
  return null;
}

function readRuntimeInjection(): CardoRuntimeInjection | null {
  if (typeof window === 'undefined') return null;
  const injected = window.__CARDO_RUNTIME__;
  if (
    injected &&
    typeof injected.baseUrl === 'string' &&
    injected.baseUrl.length > 0 &&
    typeof injected.token === 'string' &&
    injected.token.length >= 32
  ) {
    return injected;
  }
  return null;
}

function readBootstrapCodeFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    return code && code.length > 0 ? code : null;
  } catch {
    return null;
  }
}

function stripCodeFromUrl(): void {
  if (typeof window === 'undefined' || !window.history?.replaceState) return;
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('code')) return;
    url.searchParams.delete('code');
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(window.history.state, '', next);
  } catch {
    // ignore
  }
}

function readSessionToken(): string | null {
  try {
    const token = sessionStorage.getItem('cardo.runtime.token');
    return token && token.length >= 32 ? token : null;
  } catch {
    return null;
  }
}

function isLikelyRuntimeHostedPage(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return path === '/app' || path.startsWith('/app/') || path === '/' || path === '/index.html';
}

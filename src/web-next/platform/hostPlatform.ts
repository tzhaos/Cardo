/**
 * Runtime-only hostPlatform facade (design §6.16).
 *
 * All surfaces connect via RuntimeClient:
 * - Web: cardo open code exchange / same-origin session token
 * - Desktop: preload injects window.__CARDO_RUNTIME__ (fail-closed)
 * - Extension: NM runtime.discover injects window.__CARDO_RUNTIME__
 *
 * AppPorts remains for non-DB shell capabilities only.
 */

import { getAppPorts } from '../../core/runtime/appPorts';
import type { WorkspaceCommand } from '../../core/contracts/workspaceCommands';
import type { ActivityLogInput } from '../../core/application/operationLogService';
import { workspaceTransferDocumentSchema } from '../../core/contracts/workspaceTransfer';
import type { InitialWorkspacePreferences } from '../../core/database/initializeWorkspaceDatabase';
import type { InvalidationScope } from '../../core/contracts/runtimeProtocol';
import {
  exchangeOneTimeCode,
  RuntimeClient,
  type RuntimeClientKind,
} from '../../client/runtimeClient';

export interface CardoRuntimeInjection {
  baseUrl: string;
  token: string;
  client?: RuntimeClientKind;
}

declare global {
  interface Window {
    __CARDO_RUNTIME__?: CardoRuntimeInjection;
    /** Desktop preload fail-closed sentinel when Runtime config IPC is missing. */
    __CARDO_RUNTIME_MISSING__?: boolean;
  }
}

let runtimeClient: RuntimeClient | null = null;
let readyLocked = false;
let databaseTaskQueue: Promise<unknown> = Promise.resolve();
/** Re-entrancy depth so applyScopes queries can run inside an active command task. */
let databaseTaskDepth = 0;
/**
 * Depth while RuntimeClient is applying invalidation scopes (initiator HTTP ok or
 * remote SSE). Scope re-queries must not enter databaseTaskQueue: a concurrent
 * command already on that queue awaits applyQueue, which would deadlock with an
 * in-flight SSE/initiator apply that itself waits on the same queue.
 */
let scopeApplyDepth = 0;
let ensureReadyPromise: Promise<void> | null = null;

/**
 * Clear Runtime client state so Extension guide Retry can re-discover and re-hello
 * after a post-connect init failure. Best-effort bye first.
 */
export async function resetHostPlatformForRetry(): Promise<void> {
  const previous = runtimeClient;
  runtimeClient = null;
  ensureReadyPromise = null;
  readyLocked = false;
  void import('../app/stores/uiStore').then(({ useUiStore }) => {
    useUiStore.getState().setRuntimeConnectionStatus('disconnected');
  });
  if (previous) {
    try {
      await previous.close();
    } catch {
      // best-effort unregister
    }
  }
}

/**
 * Resolve Runtime bootstrap once:
 * - injected window.__CARDO_RUNTIME__ (baseUrl+token) — Desktop preload / Extension NM
 * - ?code= one-time exchange (same-origin Runtime-hosted Web)
 * - sessionStorage token on Runtime-hosted pages
 * - Desktop fail-closed without injection
 * Never falls back to a local SQLite / OPFS writer.
 */
export function ensureHostPlatformReady(): Promise<void> {
  ensureReadyPromise ??= resolveRuntimeConnection().catch((error) => {
    // Allow Extension/Web retry after failed discover/connect.
    ensureReadyPromise = null;
    readyLocked = false;
    runtimeClient = null;
    throw error;
  });
  return ensureReadyPromise;
}

async function resolveRuntimeConnection(): Promise<void> {
  if (readyLocked) return;

  const isDesktopShell =
    typeof window !== 'undefined' &&
    (Boolean(window.cardoDesktop) || window.__CARDO_RUNTIME_MISSING__ === true);

  const injection = readRuntimeInjection();
  if (injection) {
    await startRuntimeMode(injection.baseUrl, injection.token, injection.client ?? 'web');
    return;
  }

  if (isDesktopShell) {
    throw new Error(
      'Desktop Runtime config missing. Main must inject window.__CARDO_RUNTIME__ via preload before load.',
    );
  }

  const code = readBootstrapCodeFromLocation();
  if (code) {
    const baseUrl = window.location.origin;
    const exchanged = await exchangeOneTimeCode(baseUrl, code);
    stripCodeFromUrl();
    try {
      sessionStorage.setItem('cardo.runtime.token', exchanged.token);
    } catch {
      // private mode etc.
    }
    await startRuntimeMode(baseUrl, exchanged.token, 'web');
    return;
  }

  const sessionToken = readSessionToken();
  if (sessionToken && isLikelyRuntimeHostedPage()) {
    await startRuntimeMode(window.location.origin, sessionToken, 'web');
    return;
  }

  throw new Error(
    isLikelyRuntimeHostedPage()
      ? 'Runtime mode requested but no token. Open via `cardo open` (one-time code bootstrap).'
      : 'Cardo Runtime is not connected. Start Cardo CLI/Desktop and ensure the native messaging host is installed.',
  );
}

async function startRuntimeMode(
  baseUrl: string,
  token: string,
  client: RuntimeClientKind,
): Promise<void> {
  const clientInstance = new RuntimeClient({
    baseUrl,
    token,
    client,
    clientVersion: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0',
    onApplyScopes: applyRuntimeScopes,
    onConnectionChange: (status) => {
      void import('../app/stores/uiStore').then(({ useUiStore }) => {
        useUiStore.getState().setRuntimeConnectionStatus(status);
      });
    },
  });
  await clientInstance.connect();
  runtimeClient = clientInstance;
  readyLocked = true;

  // connect() waits for first ready; mark connected for any brief pre-stream UI.
  void import('../app/stores/uiStore').then(({ useUiStore }) => {
    useUiStore.getState().setRuntimeConnectionStatus('connected');
  });

  if (typeof window !== 'undefined') {
    // once: avoid stacking listeners if startRuntimeMode is re-entered after retry reset.
    // Stream onStreamClose remains primary unregister if bye fetch is torn down mid-close.
    window.addEventListener(
      'pagehide',
      () => {
        void clientInstance.close();
      },
      { once: true },
    );
  }
}

/**
 * Apply InvalidationScope list via typed queries into stores (design §6.9.2).
 * Lazy-imports stores to avoid circular dependencies with hostPlatform.
 * Marks scopeApplyDepth so nested queryPreferences / history queries bypass
 * databaseTaskQueue (initiator + remote SSE share this path).
 */
export async function applyRuntimeScopes(scopes: InvalidationScope[]): Promise<void> {
  if (!scopes.length) return;
  scopeApplyDepth += 1;
  try {
    const [{ applyWorkspaceInvalidationScopes }, { applyPreferencesInvalidationScopes }] =
      await Promise.all([
        import('../app/stores/workspaceStore'),
        import('../app/stores/preferencesStore'),
      ]);
    // Preferences first so theme/locale/colorMode land even if history query fails.
    await applyPreferencesInvalidationScopes(scopes);
    await applyWorkspaceInvalidationScopes(scopes);
  } finally {
    scopeApplyDepth -= 1;
  }
}

function requireRuntimeClient(): RuntimeClient {
  if (!runtimeClient) {
    throw new Error('RuntimeClient is not connected.');
  }
  return runtimeClient;
}

export function initializeWorkspace(initialPreferences: InitialWorkspacePreferences) {
  return runDatabaseTask(async () => {
    await requireRuntimeClient().ensureInitialized(initialPreferences);
  });
}

export function dispatchDatabaseCommand(command: WorkspaceCommand) {
  return runDatabaseTask(async () => {
    // Scopes applied inside RuntimeClient from command.ok (initiator path).
    return await requireRuntimeClient().dispatchCommand(command);
  });
}

export function undoDatabaseHistory() {
  return runDatabaseTask(async () => {
    const ok = await requireRuntimeClient().historyUndo();
    return ok.applied;
  });
}

export function redoDatabaseHistory() {
  return runDatabaseTask(async () => {
    const ok = await requireRuntimeClient().historyRedo();
    return ok.applied;
  });
}

export function queryDatabaseHistoryState() {
  return runDatabaseTask(async () => {
    return await requireRuntimeClient().queryHistoryState();
  });
}

export function queryWorkspaceProjection() {
  return runDatabaseTask(async () => {
    return await requireRuntimeClient().queryWorkspaceProjection();
  });
}

export function queryWorkspaceState() {
  return runDatabaseTask(async () => {
    return await requireRuntimeClient().queryWorkspaceState();
  });
}

export function queryPageTabs() {
  return runDatabaseTask(async () => {
    return await requireRuntimeClient().queryPageTabs();
  });
}

export function queryPageBoxes(pageId: string) {
  return runDatabaseTask(async () => {
    return await requireRuntimeClient().queryPageBoxes(pageId);
  });
}

export function queryBoxItems(boxId: string) {
  return runDatabaseTask(async () => {
    return await requireRuntimeClient().queryBoxItems(boxId);
  });
}

export function recordActivity(input: ActivityLogInput) {
  void runDatabaseTask(async () => {
    await requireRuntimeClient().activityRecord(input);
  }).catch((error: unknown) => console.error('Failed to record activity', error));
}

export async function exportOperationLog() {
  await runDatabaseTask(async () => {
    const exported = await requireRuntimeClient().exportOperationLog();
    const exportedAt = new Date().toISOString();
    getAppPorts().fileExport.downloadJson(
      `cardo-operation-log-${exportedAt.slice(0, 10)}.json`,
      JSON.stringify(
        {
          format: 'cardo-operation-log',
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
  });
}

export async function exportWorkspaceData() {
  await runDatabaseTask(async () => {
    const exported = await requireRuntimeClient().exportWorkspace();
    const document = exported.document;
    getAppPorts().fileExport.downloadJson(
      `cardo-${document.exportedAt.slice(0, 10)}.json`,
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
    return await requireRuntimeClient().queryPreferences();
  });
}

export function queryGlobalSearch(query: string) {
  return runDatabaseTask(async () => {
    return await requireRuntimeClient().queryGlobalSearch(query);
  });
}

function runDatabaseTask<T>(task: () => Promise<T>): Promise<T> {
  // Nested calls (command.ok apply) and scope-apply re-queries must not wait on
  // the outer databaseTaskQueue — otherwise SSE apply + concurrent command deadlock.
  if (databaseTaskDepth > 0 || scopeApplyDepth > 0) {
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
 * Non-DB platform boundary used by web-next. Entries configure shared shell
 * ports before rendering so the same UI can use Chrome or Electron.
 */
export function openExternalUrl(url: string) {
  getAppPorts().tabs.openUrl(url);
}

export async function openLocalResource(path: string) {
  const opened = await requireRuntimeClient().openLocalResource(path);
  return opened
    ? ({ status: 'requested' } as const)
    : ({ status: 'failed', errorMessage: 'Runtime could not open the local resource.' } as const);
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

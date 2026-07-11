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

let database: KhaosDatabase | null = null;
let databaseTaskQueue: Promise<unknown> = Promise.resolve();

function getKhaosDatabase() {
  database ??= createDatabaseClient(getAppPorts().database);
  return database;
}

export function initializeWorkspace(initialPreferences: InitialWorkspacePreferences) {
  return runDatabaseTask(() => initializeWorkspaceDatabase(getKhaosDatabase(), initialPreferences));
}

export function dispatchDatabaseCommand(command: WorkspaceCommand) {
  return runDatabaseTask(async () => {
    const execution = await executeDatabaseCommand(getKhaosDatabase(), command);
    return execution.result;
  });
}

export function undoDatabaseHistory() {
  return runDatabaseTask(async () => {
    const execution = await undoDatabaseCommand(getKhaosDatabase());
    return execution.applied;
  });
}

export function redoDatabaseHistory() {
  return runDatabaseTask(async () => {
    const execution = await redoDatabaseCommand(getKhaosDatabase());
    return execution.applied;
  });
}

export function queryDatabaseHistoryState() {
  return runDatabaseTask(() => getDatabaseHistoryState(getKhaosDatabase()));
}

export function queryWorkspaceProjection() {
  return runDatabaseTask(() => getWorkspaceProjection(getKhaosDatabase()));
}

export function queryWorkspaceState() {
  return runDatabaseTask(() => getWorkspaceState(getKhaosDatabase()));
}

export function queryPageTabs() {
  return runDatabaseTask(() => getPageTabs(getKhaosDatabase()));
}

export function queryPageBoxes(pageId: string) {
  return runDatabaseTask(() => getPageBoxes(getKhaosDatabase(), pageId));
}

export function queryBoxItems(boxId: string) {
  return runDatabaseTask(() => getBoxItems(getKhaosDatabase(), boxId));
}

export function recordActivity(input: ActivityLogInput) {
  void runDatabaseTask(() => recordDatabaseActivity(getKhaosDatabase(), input)).catch(
    (error: unknown) => console.error('Failed to record activity', error),
  );
}

export async function exportOperationLog() {
  await runDatabaseTask(async () => {
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
        itemCount: new Set(workspace.boxes.flatMap((box) => box.items.map((item) => item.id))).size,
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
  return runDatabaseTask(() => getPreferences(getKhaosDatabase()));
}

export function queryGlobalSearch(query: string) {
  return runDatabaseTask(() => searchWorkspaceDatabase(getKhaosDatabase(), query));
}

function runDatabaseTask<T>(task: () => Promise<T>): Promise<T> {
  const result = databaseTaskQueue.then(task, task);
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

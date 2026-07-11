import type { StateStorage } from 'zustand/middleware';
import { getAppPorts } from '../../core/runtime/appPorts';
import { createDatabaseClient, type KhaosDatabase } from '../../core/database/createDatabaseClient';
import { executeDatabaseCommand } from '../../core/application/executeDatabaseCommand';
import type { WorkspaceCommand } from '../../core/contracts/workspaceCommands';
import {
  getDatabaseHistoryState,
  redoDatabaseCommand,
  undoDatabaseCommand,
} from '../../core/application/historyEngine';
import { getPreferences, getWorkspaceSnapshot } from '../../core/database/workspaceQueries';
import {
  getOperationLogEntries,
  recordDatabaseActivity,
  type ActivityLogInput,
} from '../../core/application/operationLogService';

let database: KhaosDatabase | null = null;
let databaseTaskQueue: Promise<unknown> = Promise.resolve();

export function getKhaosDatabase() {
  database ??= createDatabaseClient(getAppPorts().database);
  return database;
}

export function dispatchDatabaseCommand(command: WorkspaceCommand) {
  return runDatabaseTask(() => executeDatabaseCommand(getKhaosDatabase(), command));
}

export function undoDatabaseHistory() {
  return runDatabaseTask(() => undoDatabaseCommand(getKhaosDatabase()));
}

export function redoDatabaseHistory() {
  return runDatabaseTask(() => redoDatabaseCommand(getKhaosDatabase()));
}

export function queryDatabaseHistoryState() {
  return runDatabaseTask(() => getDatabaseHistoryState(getKhaosDatabase()));
}

export function queryWorkspaceSnapshot() {
  return runDatabaseTask(() => getWorkspaceSnapshot(getKhaosDatabase()));
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

export function queryPreferences() {
  return runDatabaseTask(() => getPreferences(getKhaosDatabase()));
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
export const webNextStorage: StateStorage = {
  getItem: (name) => getAppPorts().workspaceStorage.getItem(name),
  setItem: (name, value) => getAppPorts().workspaceStorage.setItem(name, value),
  removeItem: (name) => getAppPorts().workspaceStorage.removeItem(name),
};

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

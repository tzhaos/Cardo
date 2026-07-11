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
import { getWorkspaceSnapshot } from '../../core/database/workspaceQueries';

let database: KhaosDatabase | null = null;

export function getKhaosDatabase() {
  database ??= createDatabaseClient(getAppPorts().database);
  return database;
}

export function dispatchDatabaseCommand(command: WorkspaceCommand) {
  return executeDatabaseCommand(getKhaosDatabase(), command);
}

export function undoDatabaseHistory() {
  return undoDatabaseCommand(getKhaosDatabase());
}

export function redoDatabaseHistory() {
  return redoDatabaseCommand(getKhaosDatabase());
}

export function queryDatabaseHistoryState() {
  return getDatabaseHistoryState(getKhaosDatabase());
}

export function queryWorkspaceSnapshot() {
  return getWorkspaceSnapshot(getKhaosDatabase());
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

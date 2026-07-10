import type { StateStorage } from 'zustand/middleware';
import { getAppPorts } from '../../core/runtime/appPorts';

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

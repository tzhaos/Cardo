import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopBridge } from './bridge';

const bridge: DesktopBridge = {
  storageGet: (name) => ipcRenderer.invoke('storage:get', name) as Promise<string | null>,
  storageSet: (name, value) => ipcRenderer.invoke('storage:set', name, value) as Promise<void>,
  storageRemove: (name) => ipcRenderer.invoke('storage:remove', name) as Promise<void>,
  readClipboardText: () => ipcRenderer.invoke('clipboard:read-text') as Promise<string>,
  writeClipboardText: (text) => ipcRenderer.invoke('clipboard:write-text', text) as Promise<void>,
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url) as Promise<void>,
  openLocalResource: (resourcePath) =>
    ipcRenderer.invoke('shell:open-local-resource', resourcePath) as ReturnType<
      DesktopBridge['openLocalResource']
    >,
  saveJson: (filename, payload) =>
    ipcRenderer.invoke('dialog:save-json', filename, payload) as Promise<void>,
};

contextBridge.exposeInMainWorld('khaosboxDesktop', bridge);

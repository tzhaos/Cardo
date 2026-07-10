import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopBridge } from './bridge';

const bridge: DesktopBridge = {
  minimizeWindow: () => ipcRenderer.invoke('window:minimize') as Promise<void>,
  toggleMaximizeWindow: () => ipcRenderer.invoke('window:toggle-maximize') as Promise<boolean>,
  closeWindow: () => ipcRenderer.invoke('window:close') as Promise<void>,
  isWindowMaximized: () => ipcRenderer.invoke('window:is-maximized') as Promise<boolean>,
  onWindowMaximizedChange: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, isMaximized: boolean) => {
      callback(isMaximized);
    };
    ipcRenderer.on('window:maximized-change', listener);
    return () => ipcRenderer.off('window:maximized-change', listener);
  },
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
  saveText: (filename, payload) =>
    ipcRenderer.invoke('dialog:save-text', filename, payload) as Promise<void>,
  resolveWebsiteIcon: (url) =>
    ipcRenderer.invoke('website-icon:resolve', url) as Promise<string | null>,
};

contextBridge.exposeInMainWorld('khaosboxDesktop', bridge);

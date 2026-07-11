import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopBridge } from './bridge';
import {
  desktopBooleanResponseSchema,
  desktopClipboardWriteRequestSchema,
  desktopLocalResourceRequestSchema,
  desktopLocalResourceResponseSchema,
  desktopSaveFileRequestSchema,
  desktopTextResponseSchema,
  desktopUrlRequestSchema,
  desktopVoidResponseSchema,
  desktopWebsiteIconResponseSchema,
} from '../core/contracts/desktopIpc';
import { databaseExecuteRequestSchema, databaseExecuteResponseSchema } from '../core/contracts/database';

const bridge: DesktopBridge = {
  minimizeWindow: async () => desktopVoidResponseSchema.parse(await ipcRenderer.invoke('window:minimize')),
  toggleMaximizeWindow: async () =>
    desktopBooleanResponseSchema.parse(await ipcRenderer.invoke('window:toggle-maximize')),
  closeWindow: async () => desktopVoidResponseSchema.parse(await ipcRenderer.invoke('window:close')),
  isWindowMaximized: async () =>
    desktopBooleanResponseSchema.parse(await ipcRenderer.invoke('window:is-maximized')),
  onWindowMaximizedChange: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, isMaximized: boolean) => {
      callback(desktopBooleanResponseSchema.parse(isMaximized));
    };
    ipcRenderer.on('window:maximized-change', listener);
    return () => ipcRenderer.off('window:maximized-change', listener);
  },
  databaseExecute: async (request) =>
    databaseExecuteResponseSchema.parse(
      await ipcRenderer.invoke('database:execute', databaseExecuteRequestSchema.parse(request)),
    ),
  readClipboardText: async () =>
    desktopTextResponseSchema.parse(await ipcRenderer.invoke('clipboard:read-text')),
  writeClipboardText: async (text) =>
    desktopVoidResponseSchema.parse(
      await ipcRenderer.invoke('clipboard:write-text', desktopClipboardWriteRequestSchema.parse({ text })),
    ),
  openExternal: async (url) =>
    desktopVoidResponseSchema.parse(
      await ipcRenderer.invoke('shell:open-external', desktopUrlRequestSchema.parse({ url })),
    ),
  openLocalResource: async (resourcePath) =>
    desktopLocalResourceResponseSchema.parse(
      await ipcRenderer.invoke(
        'shell:open-local-resource',
        desktopLocalResourceRequestSchema.parse({ resourcePath }),
      ),
    ),
  saveJson: async (filename, payload) =>
    desktopVoidResponseSchema.parse(
      await ipcRenderer.invoke('dialog:save-json', desktopSaveFileRequestSchema.parse({ filename, payload })),
    ),
  saveText: async (filename, payload) =>
    desktopVoidResponseSchema.parse(
      await ipcRenderer.invoke('dialog:save-text', desktopSaveFileRequestSchema.parse({ filename, payload })),
    ),
  resolveWebsiteIcon: async (url) =>
    desktopWebsiteIconResponseSchema.parse(
      await ipcRenderer.invoke('website-icon:resolve', desktopUrlRequestSchema.parse({ url })),
    ),
};

contextBridge.exposeInMainWorld('khaosboxDesktop', bridge);

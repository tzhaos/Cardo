import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopBridge } from './bridge';
import {
  desktopBooleanResponseSchema,
  desktopClipboardWriteRequestSchema,
  desktopLocalResourceRequestSchema,
  desktopLocalResourceResponseSchema,
  desktopRuntimeConfigSchema,
  desktopSaveFileRequestSchema,
  desktopTextResponseSchema,
  desktopUrlRequestSchema,
  desktopVoidResponseSchema,
  desktopWebsiteIconResponseSchema,
} from '../core/contracts/desktopIpc';

/**
 * Inject Runtime connection into renderer memory before page scripts run
 * (design §6.5 Desktop attach: preload baseUrl+token, NOT long-lived token in URL).
 * hostPlatform reads window.__CARDO_RUNTIME__ and starts RuntimeClient.
 *
 * Desktop always loads Runtime-hosted /app/ same-origin; force runtime mode
 * so missing injection fails closed instead of local DatabasePort (PR4 Issue 5).
 */
const rawRuntimeConfig = ipcRenderer.sendSync('runtime:get-config') as unknown;
const runtimeConfigParse = desktopRuntimeConfigSchema.safeParse(rawRuntimeConfig);

// Fail-closed: Desktop after PR4 is RuntimeClient-only.
contextBridge.exposeInMainWorld('__CARDO_USE_RUNTIME__', '1');

if (runtimeConfigParse.success) {
  contextBridge.exposeInMainWorld('__CARDO_RUNTIME__', runtimeConfigParse.data);
} else {
  // Still expose a sentinel so hostPlatform can show a clear error (not silent local mode).
  console.error(
    '[Cardo] Desktop preload: Runtime config missing or invalid; renderer will fail closed.',
    runtimeConfigParse.error?.message,
  );
  contextBridge.exposeInMainWorld('__CARDO_RUNTIME_MISSING__', true);
}

const bridge: DesktopBridge = {
  minimizeWindow: async () =>
    desktopVoidResponseSchema.parse(await ipcRenderer.invoke('window:minimize')),
  toggleMaximizeWindow: async () =>
    desktopBooleanResponseSchema.parse(await ipcRenderer.invoke('window:toggle-maximize')),
  closeWindow: async () =>
    desktopVoidResponseSchema.parse(await ipcRenderer.invoke('window:close')),
  isWindowMaximized: async () =>
    desktopBooleanResponseSchema.parse(await ipcRenderer.invoke('window:is-maximized')),
  onWindowMaximizedChange: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, isMaximized: boolean) => {
      callback(desktopBooleanResponseSchema.parse(isMaximized));
    };
    ipcRenderer.on('window:maximized-change', listener);
    return () => ipcRenderer.off('window:maximized-change', listener);
  },
  getRuntimeConfig: () => {
    if (!runtimeConfigParse.success) return null;
    return runtimeConfigParse.data;
  },
  readClipboardText: async () =>
    desktopTextResponseSchema.parse(await ipcRenderer.invoke('clipboard:read-text')),
  writeClipboardText: async (text) =>
    desktopVoidResponseSchema.parse(
      await ipcRenderer.invoke(
        'clipboard:write-text',
        desktopClipboardWriteRequestSchema.parse({ text }),
      ),
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
      await ipcRenderer.invoke(
        'dialog:save-json',
        desktopSaveFileRequestSchema.parse({ filename, payload }),
      ),
    ),
  saveText: async (filename, payload) =>
    desktopVoidResponseSchema.parse(
      await ipcRenderer.invoke(
        'dialog:save-text',
        desktopSaveFileRequestSchema.parse({ filename, payload }),
      ),
    ),
  resolveWebsiteIcon: async (url) =>
    desktopWebsiteIconResponseSchema.parse(
      await ipcRenderer.invoke('website-icon:resolve', desktopUrlRequestSchema.parse({ url })),
    ),
};

contextBridge.exposeInMainWorld('khaosboxDesktop', bridge);

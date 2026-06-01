import type { AppPorts } from '../../core/ports/AppPorts';
import { getDesktopBridge } from '../bridge';
import { fetchWebDavPort } from '../sync/fetchWebDavPort';

export function createDesktopPorts(): AppPorts {
  return {
    workspaceStorage: {
      getItem: (name) => getDesktopBridge().storageGet(name),
      setItem: (name, value) => getDesktopBridge().storageSet(name, value),
      removeItem: (name) => getDesktopBridge().storageRemove(name),
    },
    clipboard: {
      readText: () => getDesktopBridge().readClipboardText(),
      writeText: (text) => getDesktopBridge().writeClipboardText(text),
    },
    fileExport: {
      downloadJson: (filename, payload) => {
        void getDesktopBridge().saveJson(filename, payload);
      },
    },
    fileImport: {
      readText: (source) => {
        if (!(source instanceof File)) {
          throw new Error('Desktop file import requires a File object.');
        }

        return source.text();
      },
    },
    tabs: {
      openUrl: (url) => {
        void getDesktopBridge().openExternal(url);
      },
    },
    runtimeDocument: {
      setDocumentTitle: (title) => {
        document.title = title;
      },
      setTheme: (theme) => {
        document.documentElement.dataset.theme = theme;
      },
      addWindowListener: (type, listener) => {
        window.addEventListener(type, listener as EventListener);
      },
      removeWindowListener: (type, listener) => {
        window.removeEventListener(type, listener as EventListener);
      },
      getViewport: () => ({
        width: window.innerWidth,
        height: window.innerHeight,
      }),
    },
    localResource: {
      requestOpen: (resourcePath) => {
        void getDesktopBridge().openLocalResource(resourcePath);
        return { status: 'requested' };
      },
    },
    webDav: fetchWebDavPort,
  };
}

import type { AppPorts } from '../ports/AppPorts';

const memoryStorage = new Map<string, string>();

function createDefaultAppPorts(): AppPorts {
  return {
    browserBookmarks: {
      isSupported: () => false,
      requestTree: async () => {
        throw new Error('Browser bookmarks port is not configured.');
      },
    },
    workspaceStorage: {
      getItem: (name) => memoryStorage.get(name) ?? null,
      setItem: (name, value) => {
        memoryStorage.set(name, value);
      },
      removeItem: (name) => {
        memoryStorage.delete(name);
      },
    },
    clipboard: {
      readText: async () => '',
      writeText: async () => {},
    },
    fileExport: {
      downloadJson: () => {},
      downloadText: () => {},
    },
    fileImport: {
      readText: async () => {
        throw new Error('File import port is not configured.');
      },
    },
    tabs: {
      openUrl: () => {},
    },
    runtimeDocument: {
      setDocumentTitle: () => {},
      setTheme: () => {},
      addWindowListener: () => {},
      removeWindowListener: () => {},
      getViewport: () => ({ width: 1280, height: 720 }),
    },
    localResource: {
      requestOpen: () => ({
        status: 'failed',
        errorMessage: 'Local resource port is not configured.',
      }),
    },
    webDav: {
      testConnection: async () => {
        throw new Error('WebDAV port is not configured.');
      },
      upload: async () => {
        throw new Error('WebDAV port is not configured.');
      },
      download: async () => {
        throw new Error('WebDAV port is not configured.');
      },
    },
  };
}

let activePorts: AppPorts = createDefaultAppPorts();

export function configureAppPorts(ports: AppPorts) {
  activePorts = ports;
}

export function getAppPorts() {
  return activePorts;
}

import type { AppPorts } from '../../../core/ports/AppPorts';
import type { BrowserBookmarksPort } from '../../../core/ports/BrowserBookmarksPort';
import type { ClipboardPort } from '../../../core/ports/ClipboardPort';
import type { FileExportPort } from '../../../core/ports/FileExportPort';
import type { FileImportPort } from '../../../core/ports/FileImportPort';
import type { LocalResourcePort } from '../../../core/ports/LocalResourcePort';
import type { RuntimeDocumentPort } from '../../../core/ports/RuntimeDocumentPort';
import type { TabsPort } from '../../../core/ports/TabsPort';
import type { WebDavPort } from '../../../core/ports/WebDavPort';
import type { WorkspaceStoragePort } from '../../../core/ports/WorkspaceStoragePort';

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

export const workspaceStoragePort: WorkspaceStoragePort = {
  getItem: (name) => activePorts.workspaceStorage.getItem(name),
  setItem: (name, value) => activePorts.workspaceStorage.setItem(name, value),
  removeItem: (name) => activePorts.workspaceStorage.removeItem(name),
};

export const browserBookmarksPort: BrowserBookmarksPort = {
  isSupported: () => activePorts.browserBookmarks.isSupported(),
  requestTree: () => activePorts.browserBookmarks.requestTree(),
};

export const clipboardPort: ClipboardPort = {
  readText: () => activePorts.clipboard.readText(),
  writeText: (text) => activePorts.clipboard.writeText(text),
};

export const fileExportPort: FileExportPort = {
  downloadJson: (filename, contents) => activePorts.fileExport.downloadJson(filename, contents),
  downloadText: (filename, contents, mimeType) =>
    activePorts.fileExport.downloadText(filename, contents, mimeType),
};

export const fileImportPort: FileImportPort = {
  readText: (file) => activePorts.fileImport.readText(file),
};

export const tabsPort: TabsPort = {
  openUrl: (url) => activePorts.tabs.openUrl(url),
};

export const runtimeDocumentPort: RuntimeDocumentPort = {
  setDocumentTitle: (title) => activePorts.runtimeDocument.setDocumentTitle(title),
  setTheme: (theme) => activePorts.runtimeDocument.setTheme(theme),
  addWindowListener: (type, listener) =>
    activePorts.runtimeDocument.addWindowListener(type, listener),
  removeWindowListener: (type, listener) =>
    activePorts.runtimeDocument.removeWindowListener(type, listener),
  getViewport: () => activePorts.runtimeDocument.getViewport(),
};

export const localResourcePort: LocalResourcePort = {
  requestOpen: (resourcePath) => activePorts.localResource.requestOpen(resourcePath),
};

export const webDavPort: WebDavPort = {
  testConnection: (config) => activePorts.webDav.testConnection(config),
  upload: (config, payload) => activePorts.webDav.upload(config, payload),
  download: (config) => activePorts.webDav.download(config),
};

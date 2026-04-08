import type { ClipboardPort } from './ClipboardPort';
import type { FileExportPort } from './FileExportPort';
import type { FileImportPort } from './FileImportPort';
import type { LocalResourcePort } from './LocalResourcePort';
import type { RuntimeDocumentPort } from './RuntimeDocumentPort';
import type { TabsPort } from './TabsPort';
import type { WorkspaceStoragePort } from './WorkspaceStoragePort';
import { createBrowserExtensionPorts } from './createBrowserExtensionPorts';

/** Production singleton; tests may import {@link createBrowserExtensionPorts} instead. */
export const appPorts = createBrowserExtensionPorts();

export const workspaceStoragePort: WorkspaceStoragePort = appPorts.workspaceStorage;
export const clipboardPort: ClipboardPort = appPorts.clipboard;
export const fileExportPort: FileExportPort = appPorts.fileExport;
export const fileImportPort: FileImportPort = appPorts.fileImport;
export const tabsPort: TabsPort = appPorts.tabs;
export const runtimeDocumentPort: RuntimeDocumentPort = appPorts.runtimeDocument;
export const localResourcePort: LocalResourcePort = appPorts.localResource;

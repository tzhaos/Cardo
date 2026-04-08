import { browserClipboardPort } from '../../extension/clipboard/browserClipboardPort';
import { browserFileExportPort } from '../../extension/files/browserFileExportPort';
import { browserFileImportPort } from '../../extension/files/browserFileImportPort';
import { browserTabsPort } from '../../extension/navigation/browserTabsPort';
import { browserRuntimeDocumentPort } from '../../extension/runtime/browserRuntimeDocumentPort';
import { extensionStateStorage } from '../../extension/storage/stateStorage';
import { companionLocalResourcePort } from '../../integrations/companion/companionLocalResourcePort';
import type { ClipboardPort } from './ClipboardPort';
import type { FileExportPort } from './FileExportPort';
import type { FileImportPort } from './FileImportPort';
import type { LocalResourcePort } from './LocalResourcePort';
import type { RuntimeDocumentPort } from './RuntimeDocumentPort';
import type { TabsPort } from './TabsPort';
import type { WorkspaceStoragePort } from './WorkspaceStoragePort';

/**
 * Canonical port bundle for the Manifest V3 extension runtime.
 * Construct fresh instances for tests via {@link createBrowserExtensionPorts} or provide a stub subset.
 */
export interface AppPorts {
  workspaceStorage: WorkspaceStoragePort;
  clipboard: ClipboardPort;
  fileExport: FileExportPort;
  fileImport: FileImportPort;
  tabs: TabsPort;
  runtimeDocument: RuntimeDocumentPort;
  localResource: LocalResourcePort;
}

export function createBrowserExtensionPorts(): AppPorts {
  return {
    workspaceStorage: extensionStateStorage,
    clipboard: browserClipboardPort,
    fileExport: browserFileExportPort,
    fileImport: browserFileImportPort,
    tabs: browserTabsPort,
    runtimeDocument: browserRuntimeDocumentPort,
    localResource: companionLocalResourcePort,
  };
}

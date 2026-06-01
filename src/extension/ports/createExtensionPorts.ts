import type { AppPorts } from '../../core/ports/AppPorts';
import { browserClipboardPort } from '../clipboard/browserClipboardPort';
import { browserFileExportPort } from '../files/browserFileExportPort';
import { browserFileImportPort } from '../files/browserFileImportPort';
import { kbeLocalResourcePort } from '../local-resource/kbeLocalResourcePort';
import { browserTabsPort } from '../navigation/browserTabsPort';
import { browserRuntimeDocumentPort } from '../runtime/browserRuntimeDocumentPort';
import { extensionStateStorage } from '../storage/stateStorage';
import { extensionWebDavPort } from '../sync/extensionWebDavPort';

/**
 * Canonical port bundle for the Manifest V3 extension runtime.
 */
export function createExtensionPorts(): AppPorts {
  return {
    workspaceStorage: extensionStateStorage,
    clipboard: browserClipboardPort,
    fileExport: browserFileExportPort,
    fileImport: browserFileImportPort,
    tabs: browserTabsPort,
    runtimeDocument: browserRuntimeDocumentPort,
    localResource: kbeLocalResourcePort,
    webDav: extensionWebDavPort,
  };
}

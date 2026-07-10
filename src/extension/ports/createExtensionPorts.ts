import type { AppPorts } from '../../core/ports/AppPorts';
import { browserBookmarksPort } from '../bookmarks/browserBookmarksPort';
import { browserClipboardPort } from '../clipboard/browserClipboardPort';
import { browserFileExportPort } from '../files/browserFileExportPort';
import { browserFileImportPort } from '../files/browserFileImportPort';
import { nativeMessagingLocalResourcePort } from '../local-resource/nativeMessagingLocalResourcePort';
import { browserTabsPort } from '../navigation/browserTabsPort';
import { browserRuntimeDocumentPort } from '../runtime/browserRuntimeDocumentPort';
import { extensionStateStorage } from '../storage/stateStorage';
import { extensionWebDavPort } from '../sync/extensionWebDavPort';
import { browserWebsiteIconPort } from '../website-icons/browserWebsiteIconPort';

/**
 * Canonical port bundle for the Manifest V3 extension runtime.
 */
export function createExtensionPorts(): AppPorts {
  return {
    browserBookmarks: browserBookmarksPort,
    workspaceStorage: extensionStateStorage,
    clipboard: browserClipboardPort,
    fileExport: browserFileExportPort,
    fileImport: browserFileImportPort,
    tabs: browserTabsPort,
    runtimeDocument: browserRuntimeDocumentPort,
    localResource: nativeMessagingLocalResourcePort,
    webDav: extensionWebDavPort,
    websiteIcons: browserWebsiteIconPort,
  };
}

import type { AppPorts } from '../../core/ports/AppPorts';
import { browserClipboardPort } from '../clipboard/browserClipboardPort';
import { browserFileExportPort } from '../files/browserFileExportPort';
import { nativeMessagingLocalResourcePort } from '../local-resource/nativeMessagingLocalResourcePort';
import { browserTabsPort } from '../navigation/browserTabsPort';
import { browserWebsiteIconPort } from '../website-icons/browserWebsiteIconPort';
import { extensionDatabasePort } from '../database/extensionDatabasePort';

/**
 * Canonical port bundle for the Manifest V3 extension runtime.
 */
export function createExtensionPorts(): AppPorts {
  return {
    database: extensionDatabasePort,
    clipboard: browserClipboardPort,
    fileExport: browserFileExportPort,
    tabs: browserTabsPort,
    localResource: nativeMessagingLocalResourcePort,
    websiteIcons: browserWebsiteIconPort,
  };
}

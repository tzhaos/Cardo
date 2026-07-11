import type { AppPorts } from '../../core/ports/AppPorts';
import { browserClipboardPort } from '../clipboard/browserClipboardPort';
import { browserFileExportPort } from '../files/browserFileExportPort';
import { nativeMessagingLocalResourcePort } from '../local-resource/nativeMessagingLocalResourcePort';
import { browserTabsPort } from '../navigation/browserTabsPort';
import { browserWebsiteIconPort } from '../website-icons/browserWebsiteIconPort';

/**
 * Non-DB shell port bundle for the Manifest V3 extension Runtime client.
 * Business commands and queries go through RuntimeClient only.
 */
export function createExtensionPorts(): AppPorts {
  return {
    clipboard: browserClipboardPort,
    fileExport: browserFileExportPort,
    tabs: browserTabsPort,
    localResource: nativeMessagingLocalResourcePort,
    websiteIcons: browserWebsiteIconPort,
  };
}

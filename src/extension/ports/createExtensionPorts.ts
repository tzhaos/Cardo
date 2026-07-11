import type { AppPorts } from '../../core/ports/AppPorts';
import type { DatabasePort } from '../../core/ports/DatabasePort';
import { browserClipboardPort } from '../clipboard/browserClipboardPort';
import { browserFileExportPort } from '../files/browserFileExportPort';
import { nativeMessagingLocalResourcePort } from '../local-resource/nativeMessagingLocalResourcePort';
import { browserTabsPort } from '../navigation/browserTabsPort';
import { browserWebsiteIconPort } from '../website-icons/browserWebsiteIconPort';

/**
 * OPFS / worker SQL execute is hard-disabled in Runtime mode (PR5 / design §6.14).
 * Business commands and queries go through RuntimeClient only.
 * The worker module remains in-tree until PR6 deletes it; it must not be wired.
 */
const runtimeHardOffDatabasePort: DatabasePort = {
  async execute() {
    throw new Error(
      'Extension OPFS database execute is hard-disabled in Runtime mode (PR5). Business I/O must use RuntimeClient.',
    );
  },
};

/**
 * Canonical port bundle for the Manifest V3 extension Runtime client.
 * Non-DB ports (tabs, clipboard, icons, export, NM local resource fallback) remain.
 */
export function createExtensionPorts(): AppPorts {
  return {
    database: runtimeHardOffDatabasePort,
    clipboard: browserClipboardPort,
    fileExport: browserFileExportPort,
    tabs: browserTabsPort,
    localResource: nativeMessagingLocalResourcePort,
    websiteIcons: browserWebsiteIconPort,
  };
}

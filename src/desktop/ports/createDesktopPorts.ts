import type { AppPorts } from '../../core/ports/AppPorts';
import { getDesktopBridge } from '../bridge';

/**
 * Desktop shell AppPorts after PR6.
 * Business reads/writes go through RuntimeClient (hostPlatform).
 * No DatabasePort / raw SQL IPC path.
 */
export function createDesktopPorts(): AppPorts {
  return {
    clipboard: {
      readText: () => getDesktopBridge().readClipboardText(),
      writeText: (text) => getDesktopBridge().writeClipboardText(text),
    },
    fileExport: {
      downloadJson: (filename, payload) => {
        void getDesktopBridge().saveJson(filename, payload);
      },
      downloadText: (filename, payload) => {
        void getDesktopBridge().saveText(filename, payload);
      },
    },
    tabs: {
      openUrl: (url) => {
        void getDesktopBridge().openExternal(url);
      },
    },
    localResource: {
      requestOpen: async (resourcePath) => {
        // hostPlatform.openLocalResource routes through Runtime capability first.
        // This port remains for non-DB shell open when called directly.
        const result = await getDesktopBridge().openLocalResource(resourcePath);
        return result.ok
          ? { status: 'requested' }
          : { status: 'failed', errorMessage: result.error };
      },
    },
    websiteIcons: {
      resolve: (url) => getDesktopBridge().resolveWebsiteIcon(url),
    },
  };
}

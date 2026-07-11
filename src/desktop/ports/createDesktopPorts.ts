import type { AppPorts } from '../../core/ports/AppPorts';
import { getDesktopBridge } from '../bridge';

/**
 * Desktop AppPorts after PR4.
 * Business reads/writes go through RuntimeClient (hostPlatform runtime mode).
 * database port is intentionally unusable so local DatabasePort path cannot
 * open a second SQLite writer via IPC.
 */
export function createDesktopPorts(): AppPorts {
  return {
    database: {
      execute: async () => {
        throw new Error(
          'Desktop database:execute is retired for business I/O (PR4). Use RuntimeClient via hostPlatform.',
        );
      },
    },
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
        // Prefer Runtime capability when hostPlatform is in runtime mode;
        // hostPlatform.openLocalResource routes there. This port remains for
        // non-DB shell open when called directly.
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

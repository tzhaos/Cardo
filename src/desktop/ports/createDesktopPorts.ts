import type { AppPorts } from '../../core/ports/AppPorts';
import { getDesktopBridge } from '../bridge';
import { databaseExecuteResponseSchema } from '../../core/contracts/database';

export function createDesktopPorts(): AppPorts {
  return {
    database: {
      execute: async (request) =>
        databaseExecuteResponseSchema.parse(await getDesktopBridge().databaseExecute(request)),
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

/**
 * Runtime-hosted Web entry (design §6.5 / §6.16).
 * Also used by Desktop BrowserWindow loading `${baseUrl}/app/` same-origin.
 * When preload exposes cardoDesktop, use Desktop shell ports (clipboard/dialogs/titlebar).
 */

import { configureAppPorts } from '../core/runtime/appPorts';
import type { AppPorts } from '../core/ports/AppPorts';
import { startWebNextApp } from '../web/app/start';
import { browserClipboardPort } from '../extension/clipboard/browserClipboardPort';
import { browserFileExportPort } from '../extension/files/browserFileExportPort';
import { createDesktopPorts } from '../desktop/ports/createDesktopPorts';

function createWebRuntimePorts(): AppPorts {
  return {
    clipboard: browserClipboardPort,
    fileExport: browserFileExportPort,
    tabs: {
      openUrl(url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      },
    },
    localResource: {
      // hostPlatform.openLocalResource routes through Runtime capability.
      requestOpen: () => ({
        status: 'failed',
        errorMessage: 'Use hostPlatform.openLocalResource (Runtime capability).',
      }),
    },
    websiteIcons: {
      async resolve(url) {
        try {
          const pageUrl = new URL(url);
          if (pageUrl.protocol !== 'http:' && pageUrl.protocol !== 'https:') return null;
          const faviconUrl = new URL('/favicon.ico', pageUrl).toString();
          const response = await fetch(faviconUrl, {
            cache: 'force-cache',
            credentials: 'omit',
          });
          if (!response.ok) return null;
          const blob = await response.blob();
          if (!blob.size || blob.size > 256 * 1024) return null;
          return await new Promise<string | null>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        } catch {
          return null;
        }
      },
    },
  };
}

// Desktop Electron shell: preload injects cardoDesktop + __CARDO_RUNTIME__.
const useDesktopPorts = typeof window !== 'undefined' && Boolean(window.cardoDesktop);

configureAppPorts(useDesktopPorts ? createDesktopPorts() : createWebRuntimePorts());
startWebNextApp();

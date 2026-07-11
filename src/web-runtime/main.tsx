/**
 * Runtime-hosted Web entry (design §6.5 / §6.16).
 * Also used by Desktop BrowserWindow loading `${baseUrl}/app/` same-origin (PR4).
 * When preload exposes khaosboxDesktop, use Desktop shell ports (clipboard/dialogs/titlebar).
 */

import { configureAppPorts } from '../core/runtime/appPorts';
import type { AppPorts } from '../core/ports/AppPorts';
import { startWebNextApp } from '../web-next/app/start';
import { browserClipboardPort } from '../extension/clipboard/browserClipboardPort';
import { browserFileExportPort } from '../extension/files/browserFileExportPort';
import { createDesktopPorts } from '../desktop/ports/createDesktopPorts';

function createWebRuntimePorts(): AppPorts {
  return {
    // Local DatabasePort is unused in runtime mode; keep a hard-fail stub.
    database: {
      execute: async () => {
        throw new Error(
          'Web Runtime client must use RuntimeClient (no local DatabasePort).',
        );
      },
    },
    clipboard: browserClipboardPort,
    fileExport: browserFileExportPort,
    tabs: {
      openUrl(url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      },
    },
    localResource: {
      // hostPlatform.openLocalResource routes through Runtime capability in runtime mode.
      requestOpen: () => ({
        status: 'failed',
        errorMessage: 'Use hostPlatform.openLocalResource in runtime mode.',
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
            reader.onload = () =>
              resolve(typeof reader.result === 'string' ? reader.result : null);
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

// Prefer runtime when hosted under /app (cardo open / serve static UI / Desktop).
if (typeof window !== 'undefined' && window.__CARDO_USE_RUNTIME__ == null) {
  window.__CARDO_USE_RUNTIME__ = '1';
}

// Desktop Electron shell: preload injects khaosboxDesktop + __CARDO_RUNTIME__.
const useDesktopPorts =
  typeof window !== 'undefined' && Boolean(window.khaosboxDesktop);

configureAppPorts(useDesktopPorts ? createDesktopPorts() : createWebRuntimePorts());
startWebNextApp();

/**
 * Extension shell bootstrap (design §6.4 / PR6).
 *
 * Primary path: toolbar → app.html → NM runtime.discover → inject
 * window.__CARDO_RUNTIME__ → RuntimeClient (same revision space as Web/Desktop).
 * No OPFS / local SQLite authority path.
 */

import { configureAppPorts } from '../../core/runtime/appPorts';
import { startWebNextApp } from '../../web-next/app/start';
import { createExtensionPorts } from '../ports/createExtensionPorts';
import {
  discoverRuntimeViaNativeMessaging,
  RuntimeDiscoverError,
} from '../runtime/discoverRuntime';
import { renderRuntimeGuide } from './runtimeGuide';

let bootstrapInFlight = false;

async function injectRuntimeFromNativeMessaging(): Promise<void> {
  const discovery = await discoverRuntimeViaNativeMessaging();
  // Memory only — never put long-lived token in URL or localStorage (design §6.5).
  window.__CARDO_RUNTIME__ = {
    baseUrl: discovery.baseUrl,
    token: discovery.token,
    client: 'extension',
  };
}

async function clearInjectionForRetry(): Promise<void> {
  try {
    delete window.__CARDO_RUNTIME__;
  } catch {
    window.__CARDO_RUNTIME__ = undefined;
  }
  // Dynamic import avoids static hostPlatform in the extension entry chunk.
  const { resetHostPlatformForRetry } = await import('../../web-next/platform/hostPlatform');
  await resetHostPlatformForRetry();
}

function scheduleRetry(): void {
  void clearInjectionForRetry().finally(() => {
    void bootstrapExtensionApp();
  });
}

async function bootstrapExtensionApp(): Promise<void> {
  if (bootstrapInFlight) return;
  bootstrapInFlight = true;

  try {
    // Non-DB ports (tabs, clipboard, icons, file export) stay available.
    // Business I/O is RuntimeClient only.
    configureAppPorts(createExtensionPorts());

    try {
      await injectRuntimeFromNativeMessaging();
    } catch (error) {
      bootstrapInFlight = false;
      renderRuntimeGuide(error, scheduleRetry);
      return;
    }

    // startWebNextApp → ensureHostPlatformReady uses injection; pagehide unregisters.
    startWebNextApp({
      surface: 'extension',
      onBootstrapError: (error) => {
        bootstrapInFlight = false;
        const wrapped =
          error instanceof RuntimeDiscoverError
            ? error
            : new RuntimeDiscoverError(
                'connect_failed',
                error instanceof Error ? error.message : String(error),
              );
        renderRuntimeGuide(wrapped, scheduleRetry);
      },
    });
  } catch (error) {
    bootstrapInFlight = false;
    renderRuntimeGuide(error, scheduleRetry);
  }
}

void bootstrapExtensionApp();

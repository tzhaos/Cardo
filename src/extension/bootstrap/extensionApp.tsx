/**
 * Extension shell bootstrap (PR5 / design §6.4).
 *
 * Primary path: toolbar → app.html → NM runtime.discover → inject
 * window.__CARDO_RUNTIME__ → RuntimeClient (same revision space as Web/Desktop).
 * OPFS business database is never opened; Runtime down shows guide UI only.
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
  // Hard-force Runtime path: hostPlatform must not fall back to local OPFS.
  window.__CARDO_USE_RUNTIME__ = '1';
}

async function clearInjectionForRetry(): Promise<void> {
  try {
    delete window.__CARDO_RUNTIME__;
  } catch {
    window.__CARDO_RUNTIME__ = undefined;
  }
  // Keep __CARDO_USE_RUNTIME__='1' so accidental local fallback stays impossible;
  // injectRuntimeFromNativeMessaging re-sets both after a successful discover.
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
    // Database port is a hard-fail stub — business I/O is RuntimeClient only.
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

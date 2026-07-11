/**
 * Loads persisted state only after a host has configured its ports, then
 * renders the UI. Waiting for hydration prevents the initial workspace from
 * flashing before the persisted default page is restored.
 *
 * ensureHostPlatformReady connects RuntimeClient before any workspace I/O.
 */

import {
  renderCardoErrorScreen,
  type CardoErrorSurface,
} from '../ui/cardo/error-screen';

export type StartWebNextAppOptions = {
  /** Extension surface uses its own guide UI on failure (PR5). */
  surface?: 'web' | 'extension' | 'desktop';
  onBootstrapError?: (error: unknown) => void;
};

export function startWebNextApp(options: StartWebNextAppOptions = {}) {
  void Promise.all([
    import('./WebNextApp'),
    import('./bootstrap'),
    import('./stores/preferencesStore'),
    import('./stores/workspaceStore'),
    import('../platform/hostPlatform'),
    import('../ui/cardo/error-boundary'),
  ])
    .then(
      async ([
        { default: WebNextApp },
        { renderWebNextRoot },
        { usePreferencesStore },
        { useWorkspaceStore },
        { ensureHostPlatformReady, initializeWorkspace },
        { CardoErrorBoundary },
      ]) => {
        const surface = resolveSurface(options.surface);

        try {
          await ensureHostPlatformReady();
        } catch (error) {
          console.error('hostPlatform bootstrap failed', error);
          if (options.onBootstrapError) {
            options.onBootstrapError(error);
            return;
          }
          renderCardoErrorScreen({ error, surface });
          return;
        }

        try {
          await initializeWorkspace({
            locale: navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en',
            colorMode: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
          });
          await useWorkspaceStore.initialize();
          await usePreferencesStore.initialize();
          renderWebNextRoot(
            <CardoErrorBoundary surface={surface}>
              <WebNextApp />
            </CardoErrorBoundary>,
          );
        } catch (error) {
          console.error('workspace bootstrap failed', error);
          if (options.onBootstrapError) {
            options.onBootstrapError(error);
            return;
          }
          renderCardoErrorScreen({ error, surface });
        }
      },
    )
    .catch((error: unknown) => {
      // Dynamic-import failure must still reach extension guide / error UI (review Issue 5).
      console.error('startWebNextApp import failed', error);
      if (options.onBootstrapError) {
        options.onBootstrapError(error);
        return;
      }
      renderCardoErrorScreen({
        error,
        surface: resolveSurface(options.surface),
      });
    });
}

function resolveSurface(surface?: StartWebNextAppOptions['surface']): CardoErrorSurface {
  if (surface) return surface;
  if (
    typeof window !== 'undefined' &&
    (Boolean(window.cardoDesktop) || window.__CARDO_RUNTIME_MISSING__ === true)
  ) {
    return 'desktop';
  }
  return 'web';
}

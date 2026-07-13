import { renderCardoErrorScreen } from '../kit/error-screen';
import type { CardoErrorSurface } from '../kit/error-screen';
/**
 * Loads persisted state only after a host has configured its ports, then
 * renders the UI. Waiting for hydration prevents the initial workspace from
 * flashing before the persisted default page is restored.
 *
 * ensureHostPlatformReady connects RuntimeClient before any workspace I/O.
 *
 * Production mounts CardoApp (sidebar shell) from `./App`. Single start path.
 */

export type StartWebNextAppOptions = {
  /** Extension surface uses its own guide UI on failure (PR5). */
  surface?: 'web' | 'extension' | 'desktop';
  onBootstrapError?: (error: unknown) => void;
};

export type StartCardoAppOptions = StartWebNextAppOptions;

export function startWebNextApp(options: StartWebNextAppOptions = {}) {
  void Promise.all([
    import('./App'),
    import('./bootstrap'),
    import('./stores/preferencesStore'),
    import('./stores/workspaceStore'),
    import('../platform/hostPlatform'),
    import('../kit'),
  ])
    .then(
      async ([
        { default: AppRoot },
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
              <AppRoot />
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

/** Preferred product alias; same implementation as startWebNextApp. */
export const startCardoApp = startWebNextApp;

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

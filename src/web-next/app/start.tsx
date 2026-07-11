/**
 * Loads persisted state only after a host has configured its ports, then
 * renders the UI. Waiting for hydration prevents the initial workspace from
 * flashing before the persisted default page is restored.
 *
 * ensureHostPlatformReady connects RuntimeClient before any workspace I/O.
 */

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
  ])
    .then(
      async ([
        { default: WebNextApp },
        { renderWebNextRoot },
        { usePreferencesStore },
        { useWorkspaceStore },
        { ensureHostPlatformReady, initializeWorkspace },
      ]) => {
        try {
          await ensureHostPlatformReady();
        } catch (error) {
          console.error('hostPlatform bootstrap failed', error);
          if (options.onBootstrapError) {
            options.onBootstrapError(error);
            return;
          }
          renderBootstrapError(
            error instanceof Error ? error.message : 'Failed to connect to Cardo Runtime.',
            options.surface,
          );
          return;
        }

        try {
          await initializeWorkspace({
            locale: navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en',
            colorMode: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
          });
          await useWorkspaceStore.initialize();
          await usePreferencesStore.initialize();
          renderWebNextRoot(<WebNextApp />);
        } catch (error) {
          console.error('workspace bootstrap failed', error);
          if (options.onBootstrapError) {
            options.onBootstrapError(error);
            return;
          }
          renderBootstrapError(
            error instanceof Error ? error.message : 'Failed to initialize workspace.',
            options.surface,
          );
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
      renderBootstrapError(
        error instanceof Error ? error.message : 'Failed to load Cardo UI modules.',
        options.surface,
      );
    });
}

function renderBootstrapError(message: string, surface?: StartWebNextAppOptions['surface']) {
  const root = document.getElementById('root');
  if (!root) return;
  root.innerHTML = '';
  const panel = document.createElement('div');
  panel.style.cssText =
    'font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:1.5rem;line-height:1.5;color:#111;';
  const title = document.createElement('h1');
  title.textContent = 'Cardo';
  title.style.cssText = 'font-size:1.25rem;margin:0 0 0.75rem;font-weight:600;';
  const body = document.createElement('p');
  body.textContent = message;
  body.style.margin = '0 0 0.75rem';
  const hint = document.createElement('p');
  const isDesktop =
    surface === 'desktop' ||
    (typeof window !== 'undefined' &&
      (Boolean(window.cardoDesktop) || window.__CARDO_RUNTIME_MISSING__ === true));
  if (surface === 'extension') {
    hint.textContent =
      'Start Cardo Desktop or `cardo serve` / `cardo open`, run `npm run native-host:install` if needed, then Retry or reload this page.';
  } else if (isDesktop) {
    hint.textContent =
      'Desktop needs a healthy Cardo Runtime with /app UI. Restart Desktop or run `cardo serve` after `npm run desktop:build` / `npm run cardo:build`.';
  } else {
    hint.textContent =
      'Run `cardo open` again for a fresh one-time code. Prefer `cardo open` over pasting long-lived tokens into the URL.';
  }
  hint.style.cssText = 'margin:0;color:#555;font-size:0.9rem;';
  panel.append(title, body, hint);
  root.append(panel);
}

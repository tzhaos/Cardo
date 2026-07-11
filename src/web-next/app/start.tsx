/**
 * Loads persisted state only after a host has configured its ports, then
 * renders the UI. Waiting for hydration prevents the initial workspace from
 * flashing before the persisted default page is restored.
 *
 * Dual-mode: ensureHostPlatformReady resolves RuntimeClient vs local DatabasePort
 * before any workspace I/O (design §6.16).
 */
export function startWebNextApp() {
  void Promise.all([
    import('./WebNextApp'),
    import('./bootstrap'),
    import('./stores/preferencesStore'),
    import('./stores/workspaceStore'),
    import('../platform/hostPlatform'),
  ]).then(
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
        renderBootstrapError(
          error instanceof Error ? error.message : 'Failed to connect to Cardo Runtime.',
        );
        return;
      }

      await initializeWorkspace({
        locale: navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en',
        colorMode: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      });
      await useWorkspaceStore.initialize();
      await usePreferencesStore.initialize();
      renderWebNextRoot(<WebNextApp />);
    },
  );
}

function renderBootstrapError(message: string) {
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
    typeof window !== 'undefined' &&
    (Boolean(window.khaosboxDesktop) || window.__CARDO_RUNTIME_MISSING__ === true);
  hint.textContent = isDesktop
    ? 'Desktop needs a healthy Cardo Runtime with /app UI. Restart Desktop or run `cardo serve` after `npm run desktop:build`.'
    : 'Run `cardo open` again to obtain a fresh one-time code.';
  hint.style.cssText = 'margin:0;color:#555;font-size:0.9rem;';
  panel.append(title, body, hint);
  root.append(panel);
}

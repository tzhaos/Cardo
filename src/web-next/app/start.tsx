/**
 * Loads persisted state only after a host has configured its ports, then
 * renders the UI. Waiting for hydration prevents the initial workspace from
 * flashing before the persisted default page is restored.
 */
export function startWebNextApp() {
  void Promise.all([
    import('./WebNextApp'),
    import('./bootstrap'),
    import('./stores/preferencesStore'),
    import('./stores/workspaceStore'),
    import('./stores/independentMenuStore'),
    import('../platform/hostPlatform'),
    import('../../core/database/initializeWorkspaceDatabase'),
  ]).then(
    async ([
      { default: WebNextApp },
      { renderWebNextRoot },
      { usePreferencesStore },
      { useWorkspaceStore },
      { useIndependentMenuStore },
      { getKhaosDatabase },
      { initializeWorkspaceDatabase },
    ]) => {
      await initializeWorkspaceDatabase(getKhaosDatabase(), {
        locale: navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en',
        colorMode: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      });
      await useWorkspaceStore.initialize();
      await usePreferencesStore.initialize();
      await Promise.all([
        useIndependentMenuStore.persist.rehydrate(),
      ]);
      renderWebNextRoot(<WebNextApp />);
    },
  );
}

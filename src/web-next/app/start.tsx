/**
 * Loads persisted state only after a host has configured its ports, then
 * renders the UI. Waiting for hydration prevents the default first page from
 * flashing before the configured entry page is restored.
 */
export function startWebNextApp() {
  void Promise.all([
    import('./WebNextApp'),
    import('./bootstrap'),
    import('./stores/preferencesStore'),
    import('./stores/workspaceStore'),
    import('./stores/operationJournalStore'),
  ]).then(
    async ([
      { default: WebNextApp },
      { renderWebNextRoot },
      { usePreferencesStore },
      { useWorkspaceStore },
      { useOperationJournalStore },
    ]) => {
      await Promise.all([
        usePreferencesStore.persist.rehydrate(),
        useWorkspaceStore.persist.rehydrate(),
        useOperationJournalStore.persist.rehydrate(),
      ]);
      renderWebNextRoot(<WebNextApp />);
    },
  );
}

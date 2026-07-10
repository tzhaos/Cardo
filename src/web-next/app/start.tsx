/**
 * Loads the UI only after a host has configured its ports. Persisted stores
 * hydrate during module evaluation, so static entry imports would otherwise
 * race Electron/extension platform setup.
 */
export function startWebNextApp() {
  void Promise.all([import('./WebNextApp'), import('./bootstrap')]).then(
    ([{ default: WebNextApp }, { renderWebNextRoot }]) => {
      renderWebNextRoot(<WebNextApp />);
    },
  );
}

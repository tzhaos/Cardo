type ImportMetaEnv = ImportMeta & { env?: { DEV?: boolean } };

function isViteDev(): boolean {
  if (typeof import.meta === 'undefined') {
    return false;
  }
  return (import.meta as ImportMetaEnv).env?.DEV === true;
}

/**
 * Lightweight diagnostics for the extension and tooling.
 * Debug/warn only run in Vite dev builds; errors are always emitted for supportability.
 */
export const log = {
  debug(...args: unknown[]) {
    if (isViteDev()) {
      console.debug('[Cardo]', ...args);
    }
  },
  warn(...args: unknown[]) {
    if (isViteDev()) {
      console.warn('[Cardo]', ...args);
    }
  },
  error(...args: unknown[]) {
    console.error('[Cardo]', ...args);
  },
};

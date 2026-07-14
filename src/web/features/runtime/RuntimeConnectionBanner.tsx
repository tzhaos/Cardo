import { useState } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { useUiStore } from '../../app/stores/uiStore';
import { ensureHostPlatformReady, resetHostPlatformForRetry } from '../../platform/hostPlatform';

/**
 * Brief non-blocking status when the Runtime event stream is reconnecting
 * or has disconnected (design §6.10 / PR7). Retry re-runs discovery/hello.
 */
export function RuntimeConnectionBanner() {
  const status = useUiStore((state) => state.runtimeConnectionStatus);
  const { t } = useI18n();
  const [retrying, setRetrying] = useState(false);

  if (status === 'connected') return null;

  const message = status === 'reconnecting' ? t('runtime.reconnecting') : t('runtime.disconnected');

  const onRetry = () => {
    if (retrying) return;
    setRetrying(true);
    void (async () => {
      try {
        await resetHostPlatformForRetry();
        await ensureHostPlatformReady();
      } catch {
        // Status stays disconnected / reconnecting via hostPlatform + RuntimeClient hooks.
      } finally {
        setRetrying(false);
      }
    })();
  };

  return (
    <div
      className={`cardo-runtime-connection-banner cardo-runtime-connection-banner--${status}`}
      role="status"
      aria-live="polite"
    >
      <span className="cardo-runtime-connection-banner-dot" aria-hidden />
      <span>{message}</span>
      <button
        type="button"
        className="cardo-runtime-connection-banner-retry"
        onClick={onRetry}
        disabled={retrying}
      >
        {t('runtime.retry')}
      </button>
    </div>
  );
}

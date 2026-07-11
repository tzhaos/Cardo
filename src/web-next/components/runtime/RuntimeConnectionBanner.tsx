import { useI18n } from '../../i18n/useI18n';
import { useUiStore } from '../../app/stores/uiStore';

/**
 * Brief non-blocking status when the Runtime event stream is reconnecting
 * or has disconnected (design §6.10 / PR7).
 */
export function RuntimeConnectionBanner() {
  const status = useUiStore((state) => state.runtimeConnectionStatus);
  const { t } = useI18n();

  if (status === 'connected') return null;

  const message =
    status === 'reconnecting' ? t('runtime.reconnecting') : t('runtime.disconnected');

  return (
    <div
      className={`wbn-runtime-connection-banner wbn-runtime-connection-banner--${status}`}
      role="status"
      aria-live="polite"
    >
      <span className="wbn-runtime-connection-banner-dot" aria-hidden />
      <span>{message}</span>
    </div>
  );
}

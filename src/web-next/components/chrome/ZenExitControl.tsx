import { usePreferencesStore } from '../../app/stores/preferencesStore';
import { useI18n } from '../../i18n/useI18n';
import { ThemeIcon } from '../../ui/icons/ThemeIcon';

/** Icon-only control to leave zen; floats like other chrome (near → show). */
export function ZenExitControl() {
  const setLayoutProfileId = usePreferencesStore((state) => state.setLayoutProfileId);
  const { t } = useI18n();

  return (
    <button
      type="button"
      className="cardo-zen-exit"
      aria-label={t('layout.exitZen')}
      title={t('layout.exitZen')}
      onClick={() => setLayoutProfileId('classic')}
    >
      <ThemeIcon name="close" size={18} />
    </button>
  );
}

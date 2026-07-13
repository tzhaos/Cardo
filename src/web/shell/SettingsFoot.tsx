import { useI18n } from '../i18n/useI18n';
import { NavItem } from '../kit/nav-item';
import { ThemeIcon } from '../kit/icon';

/**
 * Always-mounted settings entry. Not gated by chrome.sidebar / primary nav.
 */
export function SettingsFoot({ active = false, onOpen }: { active?: boolean; onOpen: () => void }) {
  const { t } = useI18n();

  return (
    <div className="cardo-v2-sidebar-foot">
      <NavItem
        active={active}
        icon={<ThemeIcon name="settings" size={16} />}
        aria-label={t('shell.settings')}
        onClick={onOpen}
      >
        {t('shell.settings')}
      </NavItem>
    </div>
  );
}

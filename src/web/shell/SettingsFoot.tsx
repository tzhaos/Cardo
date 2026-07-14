import { useI18n } from '../i18n/useI18n';
import { NavItem } from '../kit/nav-item';
import { ThemeIcon } from '../kit/icon';
import { sidebarNavItemClassName } from './SidebarPageDropBridge';

/**
 * Always-mounted settings entry. Not gated by chrome.sidebar / primary nav.
 * (Not an active-route indicator — settings uses a full-shell layout.)
 */
export function SettingsFoot({ onOpen }: { onOpen: () => void }) {
  const { t } = useI18n();

  return (
    <div className="cardo-v2-sidebar-foot">
      <NavItem
        className={sidebarNavItemClassName({ active: false })}
        icon={<ThemeIcon name="settings" size={16} />}
        aria-label={t('shell.settings')}
        onClick={onOpen}
      >
        {t('shell.settings')}
      </NavItem>
    </div>
  );
}

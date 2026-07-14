import { useEffect, useRef } from 'react';
import { SETTINGS_SECTION_IDS } from '../features/settings/SettingsPanel';
import { SettingsNavIcon } from '../features/settings/SettingsNavIcons';
import type { SettingsSectionId } from '../features/settings/settingsSearchCatalog';
import type { WebNextMessageKey } from '../i18n/messages';
import { useI18n } from '../i18n/useI18n';
import { Button } from '../kit/button';
import { NavItem } from '../kit/nav-item';
import { SearchField } from '../kit/search-field';
import { ThemeIcon } from '../kit/icon';

const SECTION_LABEL_KEYS = {
  general: 'settings.general',
  appearance: 'settings.appearance',
  data: 'settings.data',
  about: 'settings.about',
} as const satisfies Record<SettingsSectionId, WebNextMessageKey>;

export function SettingsNav({
  section,
  onSectionChange,
  searchQuery,
  onSearchQueryChange,
  onBack,
}: {
  section: SettingsSectionId;
  onSectionChange: (section: SettingsSectionId) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isSearching = searchQuery.trim().length > 0;

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  return (
    <aside className="cardo-v2-settings-nav" aria-label={t('settings.sections')}>
      <Button variant="ghost" size="sm" className="cardo-v2-settings-back" onClick={onBack}>
        <ThemeIcon name="chevronRight" size={14} className="cardo-v2-settings-back-icon" />
        <span>{t('settings.backToApp')}</span>
      </Button>

      <SearchField
        ref={searchInputRef}
        containerClassName="cardo-v2-settings-search"
        value={searchQuery}
        onChange={(event) => onSearchQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && searchQuery) {
            event.stopPropagation();
            onSearchQueryChange('');
          }
        }}
        placeholder={t('settings.searchPlaceholder')}
        aria-label={t('settings.search')}
      />

      <nav className="cardo-v2-settings-section-list" aria-label={t('settings.sections')}>
        {SETTINGS_SECTION_IDS.map((id) => {
          const active = !isSearching && section === id;
          return (
            <NavItem
              key={id}
              tone="settings"
              active={active}
              className="cardo-v2-settings-section-item"
              icon={<SettingsNavIcon id={id} />}
              aria-current={active ? 'page' : undefined}
              onClick={() => {
                onSectionChange(id);
                if (searchQuery) onSearchQueryChange('');
              }}
            >
              {t(SECTION_LABEL_KEYS[id])}
            </NavItem>
          );
        })}
      </nav>
    </aside>
  );
}

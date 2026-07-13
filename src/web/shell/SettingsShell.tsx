import { useEffect, useState } from 'react';
import { SettingsContent } from '../features/settings/SettingsPanel';
import type { SettingsSectionId } from '../features/settings/settingsSearchCatalog';
import { useI18n } from '../i18n/useI18n';
import { SettingsNav } from './SettingsNav';

/**
 * Full-shell settings mode (sidebar product shell).
 * Left section rail + right white content panel. Escape clears query first, then exits.
 * Sole production settings host after PR10 (floating SettingsWindow deleted).
 */
export function SettingsShell({
  onBack,
  initialSection = 'general',
}: {
  onBack: () => void;
  initialSection?: SettingsSectionId;
}) {
  const { t } = useI18n();
  const [section, setSection] = useState<SettingsSectionId>(initialSection);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (searchQuery.trim().length > 0) {
        event.preventDefault();
        event.stopPropagation();
        setSearchQuery('');
        return;
      }
      event.preventDefault();
      onBack();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onBack, searchQuery]);

  return (
    <div
      className="cardo-v2-settings-shell"
      role="dialog"
      aria-label={t('settings.title')}
      data-settings-chrome="embedded"
    >
      <SettingsNav
        section={section}
        onSectionChange={setSection}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onBack={onBack}
      />
      <div className="cardo-v2-settings-stage">
        <div className="cardo-v2-settings-panel">
          <SettingsContent
            section={section}
            searchQuery={searchQuery}
            onOpenSearchResult={(nextSection) => {
              setSection(nextSection);
              setSearchQuery('');
            }}
          />
        </div>
      </div>
    </div>
  );
}

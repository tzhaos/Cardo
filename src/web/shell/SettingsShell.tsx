import { useEffect, useRef, useState } from 'react';
import { SettingsContent } from '../features/settings/SettingsPanel';
import type { SettingsSectionId } from '../features/settings/settingsSearchCatalog';
import { useI18n } from '../i18n/useI18n';
import { SettingsNav } from './SettingsNav';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  const shellRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  // Capture focus on enter; SettingsNav focuses search. Restore on exit.
  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      const previous = previousFocusRef.current;
      if (previous && document.contains(previous)) {
        previous.focus();
      }
    };
  }, []);

  // Tab cycles within the settings shell (dialog focus trap).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (searchQuery.trim().length > 0) {
          event.preventDefault();
          event.stopPropagation();
          setSearchQuery('');
          return;
        }
        event.preventDefault();
        onBack();
        return;
      }
      if (event.key !== 'Tab') return;
      const root = shellRef.current;
      if (!root) return;
      const focusables = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1 && el.offsetParent !== null,
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      // Only trap when focus is already inside the shell (don't steal from portaled Select/menus).
      if (!(active instanceof HTMLElement) || !root.contains(active)) return;
      if (event.shiftKey) {
        if (active === first) {
          event.preventDefault();
          last.focus();
        }
        return;
      }
      if (active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onBack, searchQuery]);

  return (
    <div
      ref={shellRef}
      className="cardo-shell-settings-shell"
      role="dialog"
      aria-modal="true"
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
      <div className="cardo-shell-settings-stage">
        <div className="cardo-shell-settings-panel">
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

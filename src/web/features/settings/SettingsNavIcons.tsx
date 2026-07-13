import type { ReactNode } from 'react';
import { ThemeIcon } from '../../kit/icon';
import type { ThemeIconName } from '../../kit/icon';

/**
 * Settings section nav glyphs — Lucide only (via ThemeIcon).
 */

export type SettingsSectionId = 'general' | 'appearance' | 'data' | 'about';

const NAV_ICONS: Record<SettingsSectionId, ThemeIconName> = {
  general: 'options',
  appearance: 'paintBrush',
  data: 'database',
  about: 'help',
};

export function SettingsNavIcon({ id }: { id: SettingsSectionId }) {
  return (
    <span className={`cardo-settings-nav-icon cardo-settings-nav-icon-${id}`} aria-hidden="true">
      <ThemeIcon name={NAV_ICONS[id]} size={18} className="cardo-settings-nav-glyph" />
    </span>
  );
}

export function SettingsNavGlyph({ id }: { id: SettingsSectionId }): ReactNode {
  return <SettingsNavIcon id={id} />;
}

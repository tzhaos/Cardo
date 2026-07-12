import {
  Database20Color,
  Options20Color,
  PaintBrush20Color,
  QuestionCircle20Color,
} from '@fluentui/react-icons';
import type { ComponentType, ReactNode, SVGProps } from 'react';
import { usePreferencesStore } from '../../app/stores/preferencesStore';
import { ThemeIcon, type ThemeIconName } from '../../ui/icons/ThemeIcon';

/**
 * Settings section nav glyphs.
 * Fluent: official multi-color Fluent icons.
 * Other themes: monochrome pack via ThemeIcon (Material Icons / Lucide).
 */

export type SettingsSectionId = 'general' | 'appearance' | 'data' | 'about';

type FluentIcon = ComponentType<SVGProps<SVGSVGElement> & { fontSize?: number | string }>;

const FLUENT_COLOR_NAV: Record<SettingsSectionId, FluentIcon> = {
  general: Options20Color,
  appearance: PaintBrush20Color,
  data: Database20Color,
  about: QuestionCircle20Color,
};

const MONO_NAV: Record<SettingsSectionId, ThemeIconName> = {
  general: 'options',
  appearance: 'paintBrush',
  data: 'database',
  about: 'help',
};

export function SettingsNavIcon({ id }: { id: SettingsSectionId }) {
  const themeId = usePreferencesStore((state) => state.themeId);
  if (themeId === 'fluent') {
    const Icon = FLUENT_COLOR_NAV[id];
    return (
      <span className={`cardo-settings-nav-icon cardo-settings-nav-icon-${id}`} aria-hidden="true">
        <Icon className="cardo-settings-nav-glyph" fontSize={20} style={{ width: 20, height: 20 }} />
      </span>
    );
  }

  return (
    <span className={`cardo-settings-nav-icon cardo-settings-nav-icon-${id}`} aria-hidden="true">
      <ThemeIcon name={MONO_NAV[id]} size={18} className="cardo-settings-nav-glyph" />
    </span>
  );
}

export function SettingsNavGlyph({ id }: { id: SettingsSectionId }): ReactNode {
  return <SettingsNavIcon id={id} />;
}

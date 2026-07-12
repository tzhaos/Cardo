import type { ComponentType, SVGProps } from 'react';
import {
  Database20Color,
  Options20Color,
  PaintBrush20Color,
  QuestionCircle20Color,
} from '@fluentui/react-icons';

/**
 * Fluent settings nav — official Fluent UI System Icons (MIT).
 * Package: @fluentui/react-icons (microsoft/fluentui-system-icons).
 *
 * Color variants match Win11 Settings multi-color category glyphs.
 * Classic theme keeps Lucide monochrome and does not use this module.
 */

export type SettingsSectionId = 'general' | 'appearance' | 'data' | 'about';

type FluentIcon = ComponentType<SVGProps<SVGSVGElement> & { primaryFill?: string }>;

const SETTINGS_NAV_ICONS: Record<SettingsSectionId, FluentIcon> = {
  general: Options20Color,
  appearance: PaintBrush20Color,
  data: Database20Color,
  about: QuestionCircle20Color,
};

export function SettingsNavIcon({ id }: { id: SettingsSectionId }) {
  const Icon = SETTINGS_NAV_ICONS[id];
  return (
    <span className={`cardo-settings-nav-icon cardo-settings-nav-icon-${id}`} aria-hidden="true">
      <Icon className="cardo-settings-nav-glyph" fontSize={20} />
    </span>
  );
}

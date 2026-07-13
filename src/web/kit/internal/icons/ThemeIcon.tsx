import { lucideIconPack } from './lucidePack';
import type { ThemeIconName, ThemeIconPack, ThemeIconProps } from './types';

/**
 * App-wide semantic icons — always Lucide (single glyph set).
 * Theme packs only change color/chrome tokens, not icon family.
 * Call sites: shell, settings, boxes, menus — always <ThemeIcon name="…" />.
 */
export function resolveThemeIconPack(_themeId?: string): ThemeIconPack {
  return lucideIconPack;
}

export function useThemeIconPack(): ThemeIconPack {
  return lucideIconPack;
}

export function ThemeIcon({
  name,
  size = 16,
  className,
  strokeWidth,
  title,
}: ThemeIconProps & { name: ThemeIconName }) {
  const Icon = lucideIconPack[name];
  return <Icon size={size} className={className} strokeWidth={strokeWidth} title={title} />;
}

export type { ThemeIconName, ThemeIconProps };

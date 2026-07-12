import { usePreferencesStore } from '../../app/stores/preferencesStore';
import { fluentIconPack } from './packs/fluentPack';
import { lucideIconPack } from './packs/lucidePack';
import { materialIconPack } from './packs/materialPack';
import type { ThemeIconName, ThemeIconPack, ThemeIconProps } from './types';

/**
 * App-wide icon routing (not limited to settings nav):
 * - fluent   → @fluentui/react-icons (Color/Filled preferred, official Fluent System Icons)
 * - material → @mui/icons-material Rounded (official Material Icons)
 * - swiftui / glass / classic → Lucide (SF-like stroke; no free official SF web pack)
 *
 * Every chrome call site should use <ThemeIcon name="…" /> so switching theme
 * swaps the entire glyph set (bottom toolbar, top bar, boxes, menus, settings).
 */
export function resolveThemeIconPack(themeId: string): ThemeIconPack {
  switch (themeId) {
    case 'fluent':
      return fluentIconPack;
    case 'material':
      return materialIconPack;
    case 'swiftui':
    case 'glass':
    case 'classic':
    default:
      return lucideIconPack;
  }
}

export function useThemeIconPack(): ThemeIconPack {
  const themeId = usePreferencesStore((state) => state.themeId);
  return resolveThemeIconPack(themeId);
}

export function ThemeIcon({
  name,
  size = 16,
  className,
  strokeWidth,
  title,
}: ThemeIconProps & { name: ThemeIconName }) {
  const pack = useThemeIconPack();
  const Icon = pack[name];
  return <Icon size={size} className={className} strokeWidth={strokeWidth} title={title} />;
}

export type { ThemeIconName, ThemeIconProps };

import { usePreferencesStore } from '../../app/stores/preferencesStore';
import { fluentIconPack } from './packs/fluentPack';
import { lucideIconPack } from './packs/lucidePack';
import { materialIconPack } from './packs/materialPack';
import type { ThemeIconName, ThemeIconPack, ThemeIconProps } from './types';

/**
 * Per-theme icon policy (official packs preferred):
 * - fluent   → @fluentui/react-icons (Microsoft Fluent System Icons)
 * - material → @mui/icons-material Outlined (Google Material Icons)
 * - swiftui  → Lucide (SF Symbols–like; no official free SF web pack)
 * - glass    → Lucide (stroke glass / aura chrome)
 * - classic  → Lucide (default product chrome)
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

import type { ComponentType, SVGProps } from 'react';

/**
 * Semantic chrome / content icons.
 * Each theme pack maps these names to the most appropriate official glyph set.
 */
export type ThemeIconName =
  | 'settings'
  | 'search'
  | 'add'
  | 'star'
  | 'starOff'
  | 'trash'
  | 'home'
  | 'box'
  | 'folder'
  | 'document'
  | 'clipboard'
  | 'undo'
  | 'redo'
  | 'lock'
  | 'unlock'
  | 'sun'
  | 'moon'
  | 'check'
  | 'close'
  | 'chevronRight'
  | 'chevronDown'
  | 'database'
  | 'options'
  | 'paintBrush'
  | 'help'
  | 'upload'
  | 'download'
  | 'globe'
  | 'pin'
  | 'pinOff'
  | 'edit'
  | 'copy'
  | 'externalLink'
  | 'locate'
  | 'image'
  | 'apps'
  | 'window'
  | 'bookmark'
  | 'palette'
  | 'rotateCcw'
  | 'fileDown'
  | 'fileUp'
  | 'list'
  | 'layoutGrid'
  | 'collapse'
  | 'expand'
  | 'grip'
  | 'packageCheck'
  | 'panel'
  | 'heart'
  | 'music'
  | 'book'
  | 'idea'
  | 'code'
  | 'briefcase';

export interface ThemeIconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
  title?: string;
}

export type ThemeIconComponent = ComponentType<ThemeIconProps>;

export type ThemeIconPack = Record<ThemeIconName, ThemeIconComponent>;

/** Normalize third-party icons to ThemeIconProps. */
export function adaptSvgIcon(
  Icon: ComponentType<SVGProps<SVGSVGElement> & { fontSize?: number | string; size?: number }>,
  mode: 'lucide' | 'fluent' | 'mui' = 'lucide',
): ThemeIconComponent {
  return function AdaptedThemeIcon({ size = 16, className, strokeWidth, title }: ThemeIconProps) {
    // Force a square layout box so optical padding differences across packs stay centered.
    const boxStyle = {
      display: 'block' as const,
      width: size,
      height: size,
      flexShrink: 0,
    };

    if (mode === 'fluent') {
      return (
        <Icon
          className={className}
          fontSize={size}
          style={{ ...boxStyle, fontSize: size }}
          aria-hidden={title ? undefined : true}
          title={title}
        />
      );
    }
    if (mode === 'mui') {
      return (
        <Icon
          className={className}
          style={{ ...boxStyle, fontSize: size }}
          fontSize="inherit"
          aria-hidden={title ? undefined : true}
          titleAccess={title}
        />
      );
    }
    return (
      <Icon
        className={className}
        size={size}
        width={size}
        height={size}
        style={boxStyle}
        strokeWidth={strokeWidth ?? 2}
        aria-hidden={title ? undefined : true}
      />
    );
  };
}

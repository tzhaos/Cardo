import type { ComponentType, CSSProperties } from 'react';

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
  | 'chevronLeft'
  | 'chevronRight'
  | 'chevronDown'
  | 'panelLeft'
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

/**
 * Accept any third-party icon component (Lucide / Fluent / MUI OverridableComponent).
 * MUI SvgIcon types require `component` in some overloads; runtime only needs a renderable.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyIconComponent = ComponentType<any>;

/** Normalize third-party icons to ThemeIconProps. */
export function adaptSvgIcon(
  Icon: AnyIconComponent,
  mode: 'lucide' | 'fluent' | 'mui' = 'lucide',
): ThemeIconComponent {
  return function AdaptedThemeIcon({ size = 16, className, strokeWidth, title }: ThemeIconProps) {
    // Force a square layout box so optical padding differences across packs stay centered.
    const boxStyle: CSSProperties = {
      display: 'block',
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

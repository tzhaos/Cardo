import type {
  ElevationTokenMap,
  FontTokenMap,
  MotionTokenMap,
  RadiusTokenMap,
  SpaceTokenMap,
} from '../../core/contracts/themePack';

export const DEFAULT_FONT_TOKENS = {
  sans: "'Inter Variable', Inter, 'Noto Sans SC', 'Microsoft YaHei UI', 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', 'Noto Sans CJK SC', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  sizeBase: '14px',
  lineHeightBase: '1.45',
} as const satisfies FontTokenMap;

export const DEFAULT_RADIUS_TOKENS = {
  xs: '4px',
  sm: '6px',
  md: '10px',
  lg: '12px',
  xl: '16px',
  pill: '999px',
} as const satisfies RadiusTokenMap;

export const DEFAULT_SPACE_TOKENS = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '32px',
  8: '40px',
} as const satisfies SpaceTokenMap;

export const DEFAULT_MOTION_TOKENS = {
  durationFast: '120ms',
  durationNormal: '160ms',
  easing: 'ease',
} as const satisfies MotionTokenMap;

export const DEFAULT_ACCENT_COLORS = {
  blue: '#3b82f6',
  orange: '#f97316',
  purple: '#a855f7',
  emerald: '#10b981',
  red: '#ef4444',
} as const;

export const DEFAULT_ELEVATION_LIGHT = {
  shadow:
    '0 1px 1px rgba(0,0,0,.02), 0 2px 2px rgba(0,0,0,.02), 0 4px 4px rgba(0,0,0,.02), 0 8px 8px rgba(0,0,0,.02), 0 16px 16px rgba(0,0,0,.02)',
  shadowHover:
    '0 2px 2px rgba(0,0,0,.03), 0 4px 4px rgba(0,0,0,.03), 0 8px 8px rgba(0,0,0,.03), 0 16px 16px rgba(0,0,0,.03), 0 32px 32px rgba(0,0,0,.03), 0 64px 64px rgba(0,0,0,.03)',
  insetShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
} as const satisfies ElevationTokenMap;

export const DEFAULT_ELEVATION_DARK = {
  shadow:
    '0 1px 1px rgba(0,0,0,.1), 0 2px 2px rgba(0,0,0,.1), 0 4px 4px rgba(0,0,0,.1), 0 8px 8px rgba(0,0,0,.1), 0 16px 16px rgba(0,0,0,.1), inset 0 1px 0 rgba(255,255,255,.05)',
  shadowHover:
    '0 2px 2px rgba(0,0,0,.15), 0 4px 4px rgba(0,0,0,.15), 0 8px 8px rgba(0,0,0,.15), 0 16px 16px rgba(0,0,0,.15), 0 32px 32px rgba(0,0,0,.15), 0 64px 64px rgba(0,0,0,.15), inset 0 1px 0 rgba(255,255,255,.05)',
  insetShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.28)',
} as const satisfies ElevationTokenMap;

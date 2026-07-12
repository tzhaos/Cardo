import type { OverridableColorKey } from '../../../core/contracts/themePack';
import type { WebNextColorMode } from '../../themes/themeRegistry';

export interface ColorPreset {
  id: string;
  /** CSS color written into theme overrides. */
  value: string;
}

/**
 * Curated swatches per overridable token.
 * Light lists use stronger tints so 28px chips stay distinguishable (not all white).
 */
export const COLOR_OVERRIDE_PRESETS: Record<
  OverridableColorKey,
  Record<WebNextColorMode, readonly ColorPreset[]>
> = {
  blue: {
    light: [
      { id: 'cardo-blue', value: '#3b82f6' },
      { id: 'fluent-blue', value: '#0067c0' },
      { id: 'sf-blue', value: '#007aff' },
      { id: 'indigo', value: '#6366f1' },
      { id: 'violet', value: '#8b5cf6' },
      { id: 'pink', value: '#db2777' },
      { id: 'rose', value: '#e11d48' },
      { id: 'orange', value: '#ea580c' },
      { id: 'amber', value: '#d97706' },
      { id: 'emerald', value: '#059669' },
      { id: 'teal', value: '#0d9488' },
      { id: 'cyan', value: '#0891b2' },
      { id: 'slate', value: '#475569' },
    ],
    dark: [
      { id: 'cardo-blue', value: '#60a5fa' },
      { id: 'fluent-blue', value: '#60cdff' },
      { id: 'sf-blue', value: '#0a84ff' },
      { id: 'indigo', value: '#818cf8' },
      { id: 'violet', value: '#a78bfa' },
      { id: 'pink', value: '#f472b6' },
      { id: 'rose', value: '#fb7185' },
      { id: 'orange', value: '#fb923c' },
      { id: 'amber', value: '#fbbf24' },
      { id: 'emerald', value: '#34d399' },
      { id: 'teal', value: '#2dd4bf' },
      { id: 'cyan', value: '#22d3ee' },
      { id: 'slate', value: '#94a3b8' },
    ],
  },
  createBackground: {
    light: [
      { id: 'ink', value: '#111827' },
      { id: 'cardo-blue', value: '#3b82f6' },
      { id: 'fluent-blue', value: '#0067c0' },
      { id: 'sf-blue', value: '#007aff' },
      { id: 'indigo', value: '#4f46e5' },
      { id: 'violet', value: '#7c3aed' },
      { id: 'rose', value: '#e11d48' },
      { id: 'orange', value: '#ea580c' },
      { id: 'emerald', value: '#059669' },
      { id: 'teal', value: '#0f766e' },
      { id: 'slate', value: '#334155' },
    ],
    dark: [
      { id: 'snow', value: '#f3f4f6' },
      { id: 'cardo-blue', value: '#60a5fa' },
      { id: 'fluent-blue', value: '#60cdff' },
      { id: 'sf-blue', value: '#0a84ff' },
      { id: 'indigo', value: '#818cf8' },
      { id: 'violet', value: '#a78bfa' },
      { id: 'rose', value: '#fb7185' },
      { id: 'orange', value: '#fb923c' },
      { id: 'emerald', value: '#34d399' },
      { id: 'teal', value: '#2dd4bf' },
      { id: 'slate', value: '#e2e8f0' },
    ],
  },
  canvas: {
    light: [
      { id: 'cloud', value: '#f0f0f2' },
      { id: 'mist', value: '#e8eaef' },
      { id: 'sky', value: '#dbeafe' },
      { id: 'ice', value: '#e0f2fe' },
      { id: 'mint', value: '#d1fae5' },
      { id: 'sand', value: '#f5e6d3' },
      { id: 'peach', value: '#ffedd5' },
      { id: 'lilac', value: '#ede9fe' },
      { id: 'rose', value: '#fce7f3' },
      { id: 'stone', value: '#e7e5e4' },
      { id: 'slate', value: '#e2e8f0' },
      { id: 'white', value: '#ffffff' },
    ],
    dark: [
      { id: 'void', value: '#0a0a0b' },
      { id: 'classic', value: '#1a1a1b' },
      { id: 'fluent', value: '#202020' },
      { id: 'navy', value: '#0f172a' },
      { id: 'indigo', value: '#1e1b4b' },
      { id: 'graphite', value: '#18181b' },
      { id: 'forest', value: '#052e16' },
      { id: 'plum', value: '#1a1025' },
      { id: 'stone', value: '#1c1917' },
      { id: 'pure', value: '#000000' },
    ],
  },
  panel: {
    light: [
      { id: 'white', value: '#ffffff' },
      { id: 'paper', value: '#f4f4f5' },
      { id: 'cloud', value: '#e4e4e7' },
      { id: 'sky', value: '#eff6ff' },
      { id: 'ice', value: '#ecfeff' },
      { id: 'mint', value: '#ecfdf5' },
      { id: 'sand', value: '#faf6f1' },
      { id: 'peach', value: '#fff7ed' },
      { id: 'lilac', value: '#f5f3ff' },
      { id: 'rose', value: '#fdf2f8' },
      { id: 'slate', value: '#f1f5f9' },
    ],
    dark: [
      { id: 'panel', value: '#2a2a2b' },
      { id: 'fluent', value: '#2c2c2c' },
      { id: 'elevated', value: '#3f3f46' },
      { id: 'navy', value: '#1e293b' },
      { id: 'indigo', value: '#312e81' },
      { id: 'graphite', value: '#27272a' },
      { id: 'forest', value: '#14532d' },
      { id: 'plum', value: '#3b0764' },
      { id: 'stone', value: '#292524' },
    ],
  },
  surface: {
    light: [
      { id: 'white', value: '#ffffff' },
      { id: 'glass', value: 'rgba(255, 255, 255, 0.72)' },
      { id: 'fog', value: '#f4f4f5' },
      { id: 'mist', value: '#e4e4e7' },
      { id: 'sky', value: '#dbeafe' },
      { id: 'mint', value: '#d1fae5' },
      { id: 'sand', value: '#f5e6d3' },
      { id: 'lilac', value: '#e9e5ff' },
      { id: 'rose', value: '#fbcfe8' },
      { id: 'slate', value: '#cbd5e1' },
    ],
    dark: [
      { id: 'glass', value: 'rgba(42, 42, 43, 0.86)' },
      { id: 'solid', value: '#2a2a2b' },
      { id: 'fluent', value: '#2c2c2c' },
      { id: 'elevated', value: '#3f3f46' },
      { id: 'navy', value: 'rgba(30, 41, 59, 0.92)' },
      { id: 'indigo', value: 'rgba(49, 46, 129, 0.9)' },
      { id: 'graphite', value: 'rgba(39, 39, 42, 0.92)' },
      { id: 'forest', value: 'rgba(20, 83, 45, 0.9)' },
      { id: 'plum', value: 'rgba(59, 7, 100, 0.9)' },
    ],
  },
  text: {
    light: [
      { id: 'ink', value: '#111827' },
      { id: 'slate', value: '#0f172a' },
      { id: 'zinc', value: '#18181b' },
      { id: 'stone', value: '#1c1917' },
      { id: 'navy', value: '#1e3a5f' },
      { id: 'soft', value: '#374151' },
      { id: 'mid', value: '#4b5563' },
    ],
    dark: [
      { id: 'snow', value: '#f3f4f6' },
      { id: 'white', value: '#ffffff' },
      { id: 'slate', value: '#f8fafc' },
      { id: 'zinc', value: '#fafafa' },
      { id: 'soft', value: '#d1d5db' },
      { id: 'muted', value: '#9ca3af' },
    ],
  },
  settingsChrome: {
    light: [
      { id: 'white', value: '#ffffff' },
      { id: 'cloud', value: '#f4f4f5' },
      { id: 'mist', value: '#e4e4e7' },
      { id: 'sky', value: '#eff6ff' },
      { id: 'sand', value: '#faf6f1' },
      { id: 'lilac', value: '#f5f3ff' },
      { id: 'slate', value: '#f1f5f9' },
      { id: 'system', value: '#f5f5f7' },
    ],
    dark: [
      { id: 'void', value: '#0a0a0b' },
      { id: 'fluent', value: '#202020' },
      { id: 'graphite', value: '#1a1a1a' },
      { id: 'panel', value: '#2c2c2c' },
      { id: 'navy', value: '#0f172a' },
      { id: 'indigo', value: '#1e1b4b' },
      { id: 'system', value: '#1c1c1e' },
    ],
  },
  settingsHover: {
    light: [
      { id: 'gray', value: '#e4e4e7' },
      { id: 'mid', value: '#d4d4d8' },
      { id: 'sky', value: '#dbeafe' },
      { id: 'sf', value: '#e8f0fe' },
      { id: 'mint', value: '#d1fae5' },
      { id: 'lilac', value: '#ede9fe' },
      { id: 'rose', value: '#fce7f3' },
      { id: 'sand', value: '#fde68a' },
    ],
    dark: [
      { id: 'elevated', value: '#3f3f46' },
      { id: 'mid', value: '#52525b' },
      { id: 'navy', value: '#1e3a5f' },
      { id: 'indigo', value: '#312e81' },
      { id: 'sf', value: '#0a3d7a' },
      { id: 'soft', value: 'rgba(255, 255, 255, 0.12)' },
    ],
  },
};

/** Normalize common CSS colors for preset selection comparison. */
export function normalizeCssColor(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(trimmed)) return trimmed;
  if (/^#[0-9a-f]{3}$/.test(trimmed)) {
    const [, a, b, c] = trimmed;
    return `#${a}${a}${b}${b}${c}${c}`;
  }
  const rgb = trimmed.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+)\s*)?\)$/,
  );
  if (rgb) {
    const r = Number(rgb[1]);
    const g = Number(rgb[2]);
    const b = Number(rgb[3]);
    const a = rgb[4] === undefined ? 1 : Number(rgb[4]);
    if (a >= 0.999) {
      const hex = (n: number) => n.toString(16).padStart(2, '0');
      return `#${hex(r)}${hex(g)}${hex(b)}`;
    }
    return `rgba(${r}, ${g}, ${b}, ${Number.isInteger(a) ? a : Number(a.toFixed(2))})`;
  }
  return trimmed.replace(/\s+/g, ' ');
}

export function isColorPresetActive(current: string, presetValue: string): boolean {
  return normalizeCssColor(current) === normalizeCssColor(presetValue);
}

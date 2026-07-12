import type { OverridableColorKey } from '../../../core/contracts/themePack';
import type { WebNextColorMode } from '../../themes/themeRegistry';

export interface ColorPreset {
  id: string;
  /** CSS color written into theme overrides. */
  value: string;
}

/**
 * Curated swatches per overridable token.
 * Light/dark lists stay separate so neutrals remain readable in each mode.
 */
export const COLOR_OVERRIDE_PRESETS: Record<
  OverridableColorKey,
  Record<WebNextColorMode, readonly ColorPreset[]>
> = {
  blue: {
    light: [
      { id: 'cardo-blue', value: '#3b82f6' },
      { id: 'fluent-blue', value: '#0067c0' },
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
      { id: 'classic', value: '#f0f0f2' },
      { id: 'fluent', value: '#f3f3f3' },
      { id: 'warm', value: '#f5f2ec' },
      { id: 'cool', value: '#eef2f7' },
      { id: 'mint', value: '#eef7f2' },
      { id: 'lavender', value: '#f3f0f8' },
      { id: 'stone', value: '#e7e5e4' },
      { id: 'white', value: '#ffffff' },
    ],
    dark: [
      { id: 'classic', value: '#1a1a1b' },
      { id: 'fluent', value: '#202020' },
      { id: 'navy', value: '#0f172a' },
      { id: 'graphite', value: '#18181b' },
      { id: 'forest', value: '#10201a' },
      { id: 'plum', value: '#1a1424' },
      { id: 'stone', value: '#1c1917' },
      { id: 'pure', value: '#000000' },
    ],
  },
  panel: {
    light: [
      { id: 'white', value: '#ffffff' },
      { id: 'soft', value: '#fafafa' },
      { id: 'warm', value: '#fffcf7' },
      { id: 'cool', value: '#f8fafc' },
      { id: 'mint', value: '#f7fbf8' },
      { id: 'lavender', value: '#fbf8ff' },
    ],
    dark: [
      { id: 'panel', value: '#2a2a2b' },
      { id: 'fluent', value: '#2c2c2c' },
      { id: 'navy', value: '#1e293b' },
      { id: 'graphite', value: '#27272a' },
      { id: 'forest', value: '#1a2e24' },
      { id: 'plum', value: '#261c33' },
    ],
  },
  surface: {
    light: [
      { id: 'glass', value: 'rgba(255, 255, 255, 0.82)' },
      { id: 'solid', value: '#ffffff' },
      { id: 'soft', value: '#f8fafc' },
      { id: 'warm', value: 'rgba(255, 252, 247, 0.92)' },
      { id: 'cool', value: 'rgba(248, 250, 252, 0.92)' },
      { id: 'mint', value: 'rgba(247, 251, 248, 0.94)' },
    ],
    dark: [
      { id: 'glass', value: 'rgba(42, 42, 43, 0.86)' },
      { id: 'solid', value: '#2a2a2b' },
      { id: 'fluent', value: '#2c2c2c' },
      { id: 'navy', value: 'rgba(30, 41, 59, 0.92)' },
      { id: 'graphite', value: 'rgba(39, 39, 42, 0.92)' },
      { id: 'forest', value: 'rgba(26, 46, 36, 0.92)' },
    ],
  },
  text: {
    light: [
      { id: 'ink', value: '#111827' },
      { id: 'fluent', value: '#1a1a1a' },
      { id: 'slate', value: '#0f172a' },
      { id: 'zinc', value: '#18181b' },
      { id: 'stone', value: '#1c1917' },
      { id: 'soft', value: '#374151' },
    ],
    dark: [
      { id: 'snow', value: '#f3f4f6' },
      { id: 'white', value: '#ffffff' },
      { id: 'slate', value: '#f8fafc' },
      { id: 'zinc', value: '#fafafa' },
      { id: 'stone', value: '#fafaf9' },
      { id: 'soft', value: '#d1d5db' },
    ],
  },
  settingsChrome: {
    light: [
      { id: 'white', value: '#ffffff' },
      { id: 'soft', value: '#f3f3f3' },
      { id: 'classic', value: '#f0f0f2' },
      { id: 'stone', value: '#f5f5f5' },
      { id: 'warm', value: '#f7f6f4' },
    ],
    dark: [
      { id: 'fluent', value: '#202020' },
      { id: 'graphite', value: '#1a1a1a' },
      { id: 'panel', value: '#2c2c2c' },
      { id: 'classic', value: '#1a1a1b' },
      { id: 'pure', value: '#000000' },
    ],
  },
  settingsHover: {
    light: [
      { id: 'neutral', value: '#f0f0f0' },
      { id: 'soft', value: '#ebebeb' },
      { id: 'mid', value: '#e6e6e6' },
      { id: 'stone', value: '#e8e8e8' },
      { id: 'classic', value: '#e8e8ec' },
    ],
    dark: [
      { id: 'fluent', value: '#2c2c2c' },
      { id: 'mid', value: '#333333' },
      { id: 'graphite', value: '#27272a' },
      { id: 'soft', value: 'rgba(255, 255, 255, 0.08)' },
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

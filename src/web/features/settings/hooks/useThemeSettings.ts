import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../../app/hooks/useI18n';
import { usePreferencesStore } from '../../../app/stores/usePreferencesStore';
import {
  DEFAULT_DARK_ACCENT_COLOR,
  DEFAULT_LIGHT_ACCENT_COLOR,
  type AccentMode,
  type AppTheme,
  resolveAppTheme,
} from '../../../../core/domains/preferences/model/preferences';
import type { SegmentedOption } from '../ui/SettingsControls';

const ACCENT_SWATCHES = [
  '#005fb8',
  '#0f6cbd',
  '#038387',
  '#0b6a0b',
  '#498205',
  '#8764b8',
  '#7a1cac',
  '#c239b3',
  '#e3008c',
  '#ca5010',
  '#f7630c',
  '#da3b01',
  '#c50f1f',
  '#a63a46',
  '#8e562e',
  '#69797e',
];

function useResolvedTheme(theme: AppTheme) {
  const [prefersDark, setPrefersDark] = useState(
    () =>
      typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updatePreference = () => setPrefersDark(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);
    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  return resolveAppTheme(theme, prefersDark);
}

export function useThemeSettings() {
  const { locale } = useI18n();
  const theme = usePreferencesStore((state) => state.theme);
  const setTheme = usePreferencesStore((state) => state.setTheme);
  const accentMode = usePreferencesStore((state) => state.accentMode);
  const setAccentMode = usePreferencesStore((state) => state.setAccentMode);
  const accentColor = usePreferencesStore((state) => state.accentColor);
  const setAccentColor = usePreferencesStore((state) => state.setAccentColor);
  const recentAccentColors = usePreferencesStore((state) => state.recentAccentColors);
  const resolvedTheme = useResolvedTheme(theme);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const copy =
    locale === 'zh'
      ? {
          previewTitle: '\u9884\u89c8',
          modeTitle: '\u6a21\u5f0f',
          accentModeTitle: '\u5f3a\u8c03\u8272',
          recentColorsTitle: '\u6700\u8fd1\u4f7f\u7528',
          paletteTitle: '\u989c\u8272\u677f',
          customColorTitle: '\u81ea\u5b9a\u4e49',
          modeOptions: [
            { label: '\u6d45\u8272', value: 'light' },
            { label: '\u6df1\u8272', value: 'dark' },
            { label: '\u8ddf\u968f\u7cfb\u7edf', value: 'system' },
          ] as const satisfies SegmentedOption<AppTheme>[],
          accentModeOptions: [
            { label: '\u81ea\u52a8', value: 'auto' },
            { label: '\u624b\u52a8', value: 'manual' },
          ] as const satisfies SegmentedOption<AccentMode>[],
        }
      : {
          previewTitle: 'Preview',
          modeTitle: 'Mode',
          accentModeTitle: 'Accent',
          recentColorsTitle: 'Recent',
          paletteTitle: 'Palette',
          customColorTitle: 'Custom',
          modeOptions: [
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
            { label: 'System', value: 'system' },
          ] as const satisfies SegmentedOption<AppTheme>[],
          accentModeOptions: [
            { label: 'Auto', value: 'auto' },
            { label: 'Manual', value: 'manual' },
          ] as const satisfies SegmentedOption<AccentMode>[],
        };

  return {
    copy,
    theme,
    setTheme,
    accentMode,
    setAccentMode,
    accentColor,
    setAccentColor,
    resolvedTheme,
    colorInputRef,
    accentSwatches: ACCENT_SWATCHES,
    recentColors: Array.from(
      new Set([
        ...recentAccentColors,
        DEFAULT_DARK_ACCENT_COLOR,
        DEFAULT_LIGHT_ACCENT_COLOR,
        accentColor,
      ]),
    ).slice(0, 5),
  };
}

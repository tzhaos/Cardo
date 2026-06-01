import { useI18n } from '../../../app/hooks/useI18n';
import { usePreferencesStore } from '../../../app/stores/usePreferencesStore';
import {
  APP_FONT_SIZES,
  type AppFontFamily,
  type AppFontSize,
} from '../../../../core/domains/preferences/model/preferences';
import type { SelectOption } from '../ui/SettingsControls';

type LocaleValue = 'en' | 'zh';

export function useGeneralSettings() {
  const { locale, setLocale } = useI18n();
  const fontFamily = usePreferencesStore((state) => state.fontFamily);
  const setFontFamily = usePreferencesStore((state) => state.setFontFamily);
  const fontSize = usePreferencesStore((state) => state.fontSize);
  const setFontSize = usePreferencesStore((state) => state.setFontSize);
  const copy =
    locale === 'zh'
      ? {
          languageTitle: '\u8bed\u8a00',
          fontTitle: '\u5b57\u4f53',
          fontSizeTitle: '\u5b57\u53f7',
          languageOptions: [
            { label: 'English', value: 'en' },
            { label: '\u4e2d\u6587', value: 'zh' },
          ] as const satisfies SelectOption<LocaleValue>[],
          fontOptions: [
            { label: '\u9ed8\u8ba4', value: 'system' },
            { label: 'Segoe UI', value: 'segoe' },
            { label: 'Noto Sans SC', value: 'noto' },
          ] as const satisfies SelectOption<AppFontFamily>[],
        }
      : {
          languageTitle: 'Language',
          fontTitle: 'Font',
          fontSizeTitle: 'Size',
          languageOptions: [
            { label: 'English', value: 'en' },
            { label: 'Chinese', value: 'zh' },
          ] as const satisfies SelectOption<LocaleValue>[],
          fontOptions: [
            { label: 'Default', value: 'system' },
            { label: 'Segoe UI', value: 'segoe' },
            { label: 'Noto Sans SC', value: 'noto' },
          ] as const satisfies SelectOption<AppFontFamily>[],
        };

  return {
    copy,
    locale,
    setLocale,
    fontFamily,
    setFontFamily,
    fontSize,
    setFontSize,
    fontSizeOptions: APP_FONT_SIZES.map((value) => ({
      label: `${value}px`,
      value,
    })) as SelectOption<AppFontSize>[],
  };
}

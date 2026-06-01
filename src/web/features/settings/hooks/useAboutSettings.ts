import { useI18n } from '../../../app/hooks/useI18n';
import { usePreferencesStore } from '../../../app/stores/usePreferencesStore';
import { WORKSPACE_SCHEMA_VERSION } from '../../../../core/domains/workspace/model/workspace';

export function useAboutSettings() {
  const { locale, t } = useI18n();
  const currentTheme = usePreferencesStore((state) => state.theme);
  const currentFontFamily = usePreferencesStore((state) => state.fontFamily);
  const currentFontSize = usePreferencesStore((state) => state.fontSize);

  const copy =
    locale === 'zh'
      ? {
          versionLabel: '\u7248\u672c',
          licenseLabel: '\u8bb8\u53ef',
          schemaLabel: '\u67b6\u6784',
          fontLabel: '\u5b57\u4f53',
          sizeLabel: '\u5b57\u53f7',
          themeLabel: '\u4e3b\u9898',
          themeValues: {
            system: '\u8ddf\u968f\u7cfb\u7edf',
            dark: '\u6df1\u8272',
            light: '\u6d45\u8272',
          } as const,
          fontValues: {
            system: '\u9ed8\u8ba4',
            segoe: 'Segoe UI',
            noto: 'Noto Sans SC',
          } as const,
        }
      : {
          versionLabel: 'Version',
          licenseLabel: 'License',
          schemaLabel: 'Schema',
          fontLabel: 'Font',
          sizeLabel: 'Size',
          themeLabel: 'Theme',
          themeValues: {
            system: 'System',
            dark: 'Dark',
            light: 'Light',
          } as const,
          fontValues: {
            system: 'Default',
            segoe: 'Segoe UI',
            noto: 'Noto Sans SC',
          } as const,
        };

  return {
    brand: t('app.brand'),
    versionBadge: `v${__APP_VERSION__}`,
    stats: [
      { label: copy.versionLabel, value: `v${__APP_VERSION__}` },
      { label: copy.licenseLabel, value: __APP_LICENSE__ },
      { label: copy.schemaLabel, value: `v${WORKSPACE_SCHEMA_VERSION}` },
      { label: copy.themeLabel, value: copy.themeValues[currentTheme] },
      { label: copy.fontLabel, value: copy.fontValues[currentFontFamily] },
      { label: copy.sizeLabel, value: `${currentFontSize}px` },
    ],
  };
}

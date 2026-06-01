import { Languages, Type } from 'lucide-react';
import type {
  AppFontFamily,
  AppFontSize,
} from '../../../../core/domains/preferences/model/preferences';
import { useGeneralSettings } from '../hooks/useGeneralSettings';
import { SettingRow, WinSelect } from './SettingsControls';

export function GeneralPanel() {
  const settings = useGeneralSettings();
  const { copy } = settings;

  return (
    <div className="flex flex-col gap-2">
      <SettingRow
        icon={<Languages className="h-5 w-5 text-win-text-secondary" />}
        title={copy.languageTitle}
        action={
          <WinSelect
            value={settings.locale}
            options={copy.languageOptions}
            onChange={settings.setLocale}
          />
        }
      />
      <SettingRow
        icon={<Type className="h-5 w-5 text-win-text-secondary" />}
        title={copy.fontTitle}
        action={
          <WinSelect<AppFontFamily>
            value={settings.fontFamily}
            options={copy.fontOptions}
            onChange={settings.setFontFamily}
          />
        }
      />
      <SettingRow
        icon={<Type className="h-5 w-5 text-win-text-secondary" />}
        title={copy.fontSizeTitle}
        action={
          <WinSelect<AppFontSize>
            value={settings.fontSize}
            options={settings.fontSizeOptions}
            onChange={settings.setFontSize}
          />
        }
      />
    </div>
  );
}

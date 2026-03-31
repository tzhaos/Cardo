import { Palette } from 'lucide-react';
import { useI18n } from '../../domains/i18n/hooks/useI18n';
import { useThemeStore } from '../../domains/ui/store/useThemeStore';
import { BOX_THEMES, getBoxThemePreviewClass } from '../../domains/workspace/model/boxThemes';
import { cn } from '../../lib/utils';
import type { BoxThemeId } from '../../types/box';

interface Props {
  showThemePicker: boolean;
  setShowThemePicker: (show: boolean) => void;
  onUpdate: (theme: BoxThemeId) => void;
}

export default function BoxThemePicker({ showThemePicker, setShowThemePicker, onUpdate }: Props) {
  const { t } = useI18n();
  const appTheme = useThemeStore((state) => state.theme);

  return (
    <div className="relative">
      <button
        onClick={() => setShowThemePicker(!showThemePicker)}
        className="kb-icon-button rounded-md p-1.5 transition-colors"
        title={t('box.theme')}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <Palette size={14} />
      </button>
      {showThemePicker && (
        <div
          className="kb-popover absolute right-0 top-full z-50 mt-1 grid w-40 grid-cols-4 gap-2 rounded-xl border p-2 backdrop-blur-xl"
          onPointerDown={(event) => event.stopPropagation()}
        >
          {BOX_THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => {
                onUpdate(theme.id);
                setShowThemePicker(false);
              }}
              className={cn(
                'h-6 w-6 rounded-full border shadow-sm transition-transform hover:scale-110',
                getBoxThemePreviewClass(theme.id, appTheme),
              )}
              title={t(theme.labelKey)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

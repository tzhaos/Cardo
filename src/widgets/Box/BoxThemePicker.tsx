import { Palette } from 'lucide-react';
import { BOX_THEMES, getBoxThemePreviewClass } from '../../domains/workspace/model/boxThemes';
import type { BoxThemeId } from '../../domains/workspace/model/workspace';
import type { AppTheme } from '../../domains/preferences/model/preferences';
import { cn } from '../../lib/utils';

interface Props {
  appTheme: AppTheme;
  showThemePicker: boolean;
  setShowThemePicker: (show: boolean) => void;
  buttonLabel: string;
  onUpdate: (theme: BoxThemeId) => void;
  getThemeLabel: (labelKey: (typeof BOX_THEMES)[number]['labelKey']) => string;
}

export default function BoxThemePicker({
  appTheme,
  showThemePicker,
  setShowThemePicker,
  buttonLabel,
  onUpdate,
  getThemeLabel,
}: Props) {
  return (
    <div className="relative">
      <button
        onClick={() => setShowThemePicker(!showThemePicker)}
        className="kb-icon-button rounded-md p-1.5 transition-colors"
        title={buttonLabel}
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
              title={getThemeLabel(theme.labelKey)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

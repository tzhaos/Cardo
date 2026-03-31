import { Palette } from 'lucide-react';
import { useI18n } from '../../domains/i18n/hooks/useI18n';
import { BOX_THEMES } from '../../domains/workspace/model/boxThemes';
import { cn } from '../../lib/utils';

interface Props {
  showThemePicker: boolean;
  setShowThemePicker: (show: boolean) => void;
  onUpdate: (theme: string) => void;
}

export default function BoxThemePicker({ showThemePicker, setShowThemePicker, onUpdate }: Props) {
  const { t } = useI18n();

  return (
    <div className="relative">
      <button
        onClick={() => setShowThemePicker(!showThemePicker)}
        className="rounded-md p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        title={t('box.theme')}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <Palette size={14} />
      </button>
      {showThemePicker && (
        <div
          className="absolute right-0 top-full z-50 mt-1 grid w-40 grid-cols-4 gap-2 rounded-xl border border-zinc-700 bg-zinc-800/95 p-2 shadow-2xl backdrop-blur-xl"
          onPointerDown={(event) => event.stopPropagation()}
        >
          {BOX_THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => {
                onUpdate(theme.class);
                setShowThemePicker(false);
              }}
              className={cn(
                'h-6 w-6 rounded-full border border-white/20 shadow-sm transition-transform hover:scale-110',
                theme.preview,
              )}
              title={t(theme.labelKey)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

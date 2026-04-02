import { Download, MoonStar, Plus, SunMedium, Upload } from 'lucide-react';
import { useRef, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { useI18n } from '../../../app/hooks/useI18n';
import { runtimeDocumentPort } from '../../../app/ports/defaultPorts';
import { createWorkspaceBox } from '../../../app/use-cases/createWorkspaceBox';
import { exportWorkspace } from '../../../app/use-cases/exportWorkspace';
import { importWorkspace } from '../../../app/use-cases/importWorkspace';
import { toggleLocale } from '../../../app/use-cases/toggleLocale';
import { toggleTheme } from '../../../app/use-cases/toggleTheme';
import { useInteractionStore } from '../../../app/stores/useInteractionStore';
import { usePreferencesStore } from '../../../app/stores/usePreferencesStore';
import { useTrayBoxes, useWorkspaceDispatch } from '../../../app/stores/useWorkspaceSelectors';
import { cn } from '../../../lib/utils';
import TrayItemButton from './TrayItemButton';

const ZH_GLYPH = '\u6587';

function LocaleToggleGlyph({ locale }: { locale: 'zh' | 'en' }) {
  const isZhActive = locale === 'zh';

  return (
    <span className="relative block h-5 w-5" aria-hidden="true">
      <span
        className={cn(
          'absolute left-[1px] top-0 font-sans font-semibold leading-none transition-all',
          isZhActive ? 'text-[13px] opacity-100' : 'text-[9px] opacity-70',
        )}
      >
        {ZH_GLYPH}
      </span>
      <span
        className={cn(
          'absolute bottom-0 right-0 font-sans font-semibold leading-none transition-all',
          isZhActive ? 'text-[9px] opacity-70' : 'text-[13px] opacity-100',
        )}
      >
        A
      </span>
    </span>
  );
}

export default function TrayDock() {
  const { locale, t } = useI18n();
  const theme = usePreferencesStore((state) => state.theme);
  const boxes = useTrayBoxes();
  const dispatch = useWorkspaceDispatch();
  const setActiveBox = useInteractionStore((state) => state.setActiveBox);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    exportWorkspace(t('dock.exportFilePrefix'));
    toast.success(t('toast.dataExported'));
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      await importWorkspace(file);
      toast.success(t('toast.dataImported'));
    } catch {
      toast.error(t('toast.importFailed'));
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateBox = () => {
    const createdBox = createWorkspaceBox(runtimeDocumentPort.getViewport());
    setActiveBox(createdBox.id);
  };

  const themeToggleTitle = t(theme === 'dark' ? 'dock.switchToLightTheme' : 'dock.switchToDarkTheme');

  return (
    <div className="fixed bottom-6 left-1/2 z-[99990] -translate-x-1/2">
      <div className="kb-dock flex items-center gap-2 rounded-2xl border px-4 py-2 backdrop-blur-md">
        {boxes.map((box) => (
          <TrayItemButton
            key={box.id}
            box={box}
            onClick={() => {
              dispatch({
                type: 'box.update',
                boxId: box.id,
                updates: { isMinimized: !box.isMinimized },
              });
            }}
          />
        ))}

        <div className="kb-dock-divider mx-2 h-8 w-px" />

        <button
          onClick={handleCreateBox}
          title={t('dock.createBox')}
          aria-label={t('dock.createBox')}
          className="kb-dock-action rounded-xl p-2 transition-colors"
        >
          <Plus size={20} />
        </button>

        <button
          onClick={handleExport}
          title={t('dock.exportJson')}
          aria-label={t('dock.exportJson')}
          className="kb-dock-action rounded-xl p-2 transition-colors"
        >
          <Download size={20} />
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          title={t('dock.importJson')}
          aria-label={t('dock.importJson')}
          className="kb-dock-action rounded-xl p-2 transition-colors"
        >
          <Upload size={20} />
        </button>

        <button
          onClick={toggleTheme}
          title={themeToggleTitle}
          aria-label={themeToggleTitle}
          className="kb-dock-action rounded-xl p-2 transition-colors"
        >
          {theme === 'dark' ? <SunMedium size={20} /> : <MoonStar size={20} />}
        </button>

        <button
          onClick={toggleLocale}
          title={t(locale === 'zh' ? 'dock.switchToEnglish' : 'dock.switchToChinese')}
          aria-label={t(locale === 'zh' ? 'dock.switchToEnglish' : 'dock.switchToChinese')}
          className="kb-dock-action flex items-center justify-center rounded-xl p-2 transition-colors"
        >
          <LocaleToggleGlyph locale={locale} />
        </button>

        <input
          type="file"
          accept=".json"
          className="hidden"
          ref={fileInputRef}
          onChange={handleImport}
        />
      </div>
    </div>
  );
}

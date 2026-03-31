import { Download, MoonStar, Plus, SunMedium, Upload } from 'lucide-react';
import { useRef, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';
import { useI18n } from '../../../domains/i18n/hooks/useI18n';
import { useUIStore } from '../../../domains/ui/store/useUIStore';
import { useThemeStore } from '../../../domains/ui/store/useThemeStore';
import { parseImportedWorkspaceBoxes } from '../../../domains/workspace/model/workspaceSchema';
import { createWorkspaceExportPayload } from '../../../domains/workspace/model/workspaceState';
import { useWorkspaceStore } from '../../../domains/workspace/store/useWorkspaceStore';
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
  const { locale, toggleLocale, t } = useI18n();
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const boxIds = useWorkspaceStore(useShallow((state) => state.boxOrder));
  const toggleMinimize = useWorkspaceStore((state) => state.toggleMinimize);
  const createBox = useWorkspaceStore((state) => state.createBox);
  const replaceBoxes = useWorkspaceStore((state) => state.replaceBoxes);
  const setActiveBox = useUIStore((state) => state.setActiveBox);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = JSON.stringify(createWorkspaceExportPayload(useWorkspaceStore.getState()), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `${t('dock.exportFilePrefix')}-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(t('toast.dataExported'));
  };

  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const importedBoxes = parseImportedWorkspaceBoxes(
          JSON.parse(loadEvent.target?.result as string) as unknown,
        );

        toast.success(t('toast.dataImported'));
        replaceBoxes(importedBoxes);
      } catch {
        toast.error(t('toast.importFailed'));
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  const handleCreateBox = () => {
    const createdBoxId = createBox({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    setActiveBox(createdBoxId);
  };

  const themeToggleTitle = t(theme === 'dark' ? 'dock.switchToLightTheme' : 'dock.switchToDarkTheme');

  return (
    <div className="fixed bottom-6 left-1/2 z-[99990] -translate-x-1/2">
      <div className="kb-dock flex items-center gap-2 rounded-2xl border px-4 py-2 backdrop-blur-md">
        {boxIds.map((boxId) => (
          <TrayItemButton key={boxId} boxId={boxId} onClick={() => toggleMinimize(boxId)} />
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

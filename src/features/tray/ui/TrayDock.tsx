import { Download, Languages, Plus, Upload } from 'lucide-react';
import { useRef, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';
import { useI18n } from '../../../domains/i18n/hooks/useI18n';
import { useUIStore } from '../../../domains/ui/store/useUIStore';
import { parseImportedWorkspaceBoxes } from '../../../domains/workspace/model/workspaceSchema';
import { createWorkspaceExportPayload } from '../../../domains/workspace/model/workspaceState';
import { useWorkspaceStore } from '../../../domains/workspace/store/useWorkspaceStore';
import TrayItemButton from './TrayItemButton';

export default function TrayDock() {
  const { locale, toggleLocale, t } = useI18n();
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

  return (
    <div className="fixed bottom-6 left-1/2 z-[99990] -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-neutral-900/80 px-4 py-2 shadow-2xl backdrop-blur-md">
        {boxIds.map((boxId) => (
          <TrayItemButton key={boxId} boxId={boxId} onClick={() => toggleMinimize(boxId)} />
        ))}

        <div className="mx-2 h-8 w-px bg-white/10" />

        <button
          onClick={handleCreateBox}
          title={t('dock.createBox')}
          aria-label={t('dock.createBox')}
          className="rounded-xl bg-white/5 p-2 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
        >
          <Plus size={20} />
        </button>

        <button
          onClick={handleExport}
          title={t('dock.exportJson')}
          aria-label={t('dock.exportJson')}
          className="rounded-xl bg-white/5 p-2 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
        >
          <Download size={20} />
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          title={t('dock.importJson')}
          aria-label={t('dock.importJson')}
          className="rounded-xl bg-white/5 p-2 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
        >
          <Upload size={20} />
        </button>

        <button
          onClick={toggleLocale}
          title={t(locale === 'zh' ? 'dock.switchToEnglish' : 'dock.switchToChinese')}
          aria-label={t(locale === 'zh' ? 'dock.switchToEnglish' : 'dock.switchToChinese')}
          className="relative rounded-xl bg-white/5 p-2 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
        >
          <Languages size={20} />
          <span className="absolute -bottom-1 -right-1 rounded-full border border-neutral-900 bg-white px-1 text-[9px] font-bold leading-4 text-neutral-900">
            {t('dock.languageBadge')}
          </span>
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

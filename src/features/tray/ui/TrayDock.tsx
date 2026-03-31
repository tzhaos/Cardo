import { Download, Plus, Upload } from 'lucide-react';
import { useRef, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { useWorkspaceStore } from '../../../domains/workspace/store/useWorkspaceStore';
import type { BoxData } from '../../../types/box';
import TrayItemButton from './TrayItemButton';

export default function TrayDock() {
  const boxes = useWorkspaceStore((state) => state.boxes);
  const toggleMinimize = useWorkspaceStore((state) => state.toggleMinimize);
  const createBox = useWorkspaceStore((state) => state.createBox);
  const replaceBoxes = useWorkspaceStore((state) => state.replaceBoxes);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = JSON.stringify(boxes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `khaosbox-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported successfully');
  };

  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const importedBoxes = JSON.parse(loadEvent.target?.result as string) as unknown;

        if (!Array.isArray(importedBoxes)) {
          throw new Error('Invalid format');
        }

        replaceBoxes(importedBoxes as BoxData[]);
        toast.success('Data imported successfully');
      } catch {
        toast.error('Failed to import: invalid JSON file');
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="fixed bottom-6 left-1/2 z-[99990] -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-neutral-900/80 px-4 py-2 shadow-2xl backdrop-blur-md">
        {boxes.map((box) => (
          <TrayItemButton key={box.id} box={box} onClick={() => toggleMinimize(box.id)} />
        ))}

        <div className="mx-2 h-8 w-px bg-white/10" />

        <button
          onClick={() => createBox()}
          title="Create box"
          className="rounded-xl bg-white/5 p-2 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
        >
          <Plus size={20} />
        </button>

        <button
          onClick={handleExport}
          title="Export JSON"
          className="rounded-xl bg-white/5 p-2 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
        >
          <Download size={20} />
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          title="Import JSON"
          className="rounded-xl bg-white/5 p-2 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
        >
          <Upload size={20} />
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

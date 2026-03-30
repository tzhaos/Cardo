import { Download, Trash2, Upload, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRef } from 'react';
import { toast } from 'sonner';
import { useSettingsStore } from '../../../domains/settings/store/useSettingsStore';
import { useUIStore } from '../../../domains/ui/store/useUIStore';
import { useWorkspaceStore } from '../../../domains/workspace/store/useWorkspaceStore';
import type { BoxData } from '../../../types/box';

export default function SettingsDialog() {
  const isSettingsOpen = useUIStore((state) => state.isSettingsOpen);
  const closeSettings = useUIStore((state) => state.closeSettings);
  const boxes = useWorkspaceStore((state) => state.boxes);
  const replaceBoxes = useWorkspaceStore((state) => state.replaceBoxes);
  const clearBoxes = useWorkspaceStore((state) => state.clearBoxes);

  const defaultNewBoxLayout = useSettingsStore((state) => state.defaultNewBoxLayout);
  const allowLocalResourceLaunch = useSettingsStore((state) => state.allowLocalResourceLaunch);
  const setDefaultNewBoxLayout = useSettingsStore((state) => state.setDefaultNewBoxLayout);
  const setAllowLocalResourceLaunch = useSettingsStore((state) => state.setAllowLocalResourceLaunch);

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

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
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
        closeSettings();
      } catch {
        toast.error('Failed to import: invalid JSON file');
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  const handleClear = () => {
    if (!window.confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      return;
    }

    clearBoxes();
    toast.success('All data cleared');
    closeSettings();
  };

  return (
    <AnimatePresence>
      {isSettingsOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSettings}
            className="fixed inset-0 z-[99998] bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 z-[99999] w-full max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 bg-white/5 p-4">
              <h2 className="text-lg font-semibold text-white">Settings</h2>
              <button
                onClick={closeSettings}
                className="rounded-lg p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-6 p-6">
              <section className="space-y-3">
                <h3 className="text-sm font-medium text-white/80">Workspace defaults</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setDefaultNewBoxLayout('list')}
                    className={`rounded-xl border p-3 text-left text-sm transition-colors ${
                      defaultNewBoxLayout === 'list'
                        ? 'border-white/30 bg-white/10 text-white'
                        : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    New boxes open in list view
                  </button>
                  <button
                    onClick={() => setDefaultNewBoxLayout('grid')}
                    className={`rounded-xl border p-3 text-left text-sm transition-colors ${
                      defaultNewBoxLayout === 'grid'
                        ? 'border-white/30 bg-white/10 text-white'
                        : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    New boxes open in grid view
                  </button>
                </div>

                <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">
                  <span>Allow local resource launch actions</span>
                  <input
                    type="checkbox"
                    checked={allowLocalResourceLaunch}
                    onChange={(event) => setAllowLocalResourceLaunch(event.target.checked)}
                    className="h-4 w-4 accent-white"
                  />
                </label>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-medium text-white/80">Data management</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleExport}
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-white transition-colors hover:bg-white/10"
                  >
                    <Download size={16} />
                    <span className="text-sm">Export JSON</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-white transition-colors hover:bg-white/10"
                  >
                    <Upload size={16} />
                    <span className="text-sm">Import JSON</span>
                  </button>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleImport}
                  />
                </div>
              </section>

              <section className="space-y-3 border-t border-white/10 pt-4">
                <h3 className="text-sm font-medium text-red-400/80">Danger zone</h3>
                <button
                  onClick={handleClear}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-red-400 transition-colors hover:bg-red-500/20"
                >
                  <Trash2 size={16} />
                  <span className="text-sm">Clear all data</span>
                </button>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

import { Plus, Settings } from 'lucide-react';
import { useTrayDock } from '../hooks/useTrayDock';
import TrayItemButton from './TrayItemButton';

export default function TrayDock() {
  const dock = useTrayDock();

  return (
    <div className="fixed bottom-4 left-1/2 z-[99990] w-[min(calc(100vw-1.5rem),72rem)] -translate-x-1/2">
      <div className="kb-dock flex items-center gap-1 rounded-2xl p-1.5">
        <div className="min-w-0 flex-1">
          <div className="custom-scrollbar overflow-x-auto overflow-y-hidden">
            <div className="flex min-w-max items-center gap-1 pr-1">
              {dock.boxes.map((box) => (
                <TrayItemButton
                  key={box.id}
                  box={box}
                  compact={dock.isCompact}
                  onClick={() => dock.toggleBoxMinimized(box.id)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mx-1 h-6 w-px shrink-0 bg-win-border" />

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={dock.createBox}
            disabled={dock.hasReachedBoxLimit}
            title={dock.createBoxLabel}
            aria-label={dock.createBoxLabel}
            className="kb-dock-action flex h-10 w-10 items-center justify-center rounded-lg transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={20} className="text-win-text-secondary" />
          </button>

          <button
            onClick={dock.openSettings}
            title={dock.settingsLabel}
            aria-label={dock.settingsLabel}
            className="kb-dock-action flex h-10 w-10 items-center justify-center rounded-lg transition-all active:scale-95"
          >
            <Settings size={20} className="text-win-text-secondary" />
          </button>
        </div>
      </div>
    </div>
  );
}

import { Plus, Settings } from 'lucide-react';
import { useUIStore } from '../../../domains/ui/store/useUIStore';
import { useWorkspaceStore } from '../../../domains/workspace/store/useWorkspaceStore';
import TrayItemButton from './TrayItemButton';

export default function TrayDock() {
  const boxes = useWorkspaceStore((state) => state.boxes);
  const toggleMinimize = useWorkspaceStore((state) => state.toggleMinimize);
  const createBox = useWorkspaceStore((state) => state.createBox);
  const openSettings = useUIStore((state) => state.openSettings);

  return (
    <div className="fixed bottom-6 left-1/2 z-[99990] -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-neutral-900/80 px-4 py-2 shadow-2xl backdrop-blur-md">
        {boxes.map((box) => (
          <TrayItemButton key={box.id} box={box} onClick={() => toggleMinimize(box.id)} />
        ))}

        <div className="mx-2 h-8 w-px bg-white/10" />

        <button
          onClick={() => createBox()}
          className="rounded-xl bg-white/5 p-2 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
        >
          <Plus size={20} />
        </button>

        <button
          onClick={openSettings}
          className="rounded-xl bg-white/5 p-2 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
        >
          <Settings size={20} />
        </button>
      </div>
    </div>
  );
}

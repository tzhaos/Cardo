import { LocateFixed, Lock, Map, Unlock } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useCanvasControls } from '../hooks/useCanvasControls';

interface CanvasControlsProps {
  isMinimapOpen: boolean;
  minimapLabel: string;
  onToggleMinimap: () => void;
}

export default function CanvasControls({
  isMinimapOpen,
  minimapLabel,
  onToggleMinimap,
}: CanvasControlsProps) {
  const controls = useCanvasControls();

  return (
    <div className="absolute right-4 top-4 z-[99990] flex items-center gap-1 rounded-xl border border-win-border bg-win-mica p-1 shadow-win-card">
      <button
        type="button"
        onClick={controls.resetViewport}
        title={controls.resetViewportLabel}
        aria-label={controls.resetViewportLabel}
        className="kb-floating-action flex h-9 w-9 items-center justify-center rounded-lg transition-colors active:scale-95"
      >
        <LocateFixed size={18} />
      </button>
      <button
        type="button"
        onClick={controls.toggleViewportLock}
        title={controls.lockViewportLabel}
        aria-label={controls.lockViewportLabel}
        className={cn(
          'kb-floating-action flex h-9 w-9 items-center justify-center rounded-lg transition-colors active:scale-95',
          controls.isLocked ? 'bg-win-hover text-win-accent' : '',
        )}
      >
        {controls.isLocked ? <Lock size={18} /> : <Unlock size={18} />}
      </button>
      <button
        type="button"
        onClick={onToggleMinimap}
        title={minimapLabel}
        aria-label={minimapLabel}
        className={cn(
          'kb-floating-action flex h-9 w-9 items-center justify-center rounded-lg transition-colors active:scale-95',
          isMinimapOpen ? 'bg-win-hover text-win-accent' : '',
        )}
      >
        <Map size={18} />
      </button>
    </div>
  );
}

import { Map } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useCanvasMinimap } from '../hooks/useCanvasMinimap';

export default function CanvasMinimap() {
  const minimap = useCanvasMinimap();

  return (
    <div className="fixed right-4 top-16 z-[99990] flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={minimap.toggle}
        title={minimap.labels.toggle}
        aria-label={minimap.labels.toggle}
        className={cn(
          'kb-dock-action flex h-9 w-9 items-center justify-center rounded-lg border border-win-border bg-win-mica shadow-win-card transition-colors active:scale-95',
          minimap.isOpen ? 'bg-win-hover text-win-accent' : '',
        )}
      >
        <Map size={18} />
      </button>

      {minimap.isOpen ? (
        <div className="rounded-xl border border-win-border bg-win-mica p-2 shadow-win-flyout">
          <svg
            width={minimap.width}
            height={minimap.height}
            viewBox={`0 0 ${minimap.width} ${minimap.height}`}
            className="block cursor-crosshair rounded-lg bg-win-bg-secondary"
            onClick={minimap.handleMapClick}
          >
            {minimap.boxRects.map(({ id, rect }) => (
              <rect
                key={id}
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                rx={3}
                className="fill-win-text-secondary opacity-45"
              />
            ))}
            <rect
              x={minimap.viewportRect.x}
              y={minimap.viewportRect.y}
              width={minimap.viewportRect.width}
              height={minimap.viewportRect.height}
              rx={4}
              fill="none"
              className="stroke-win-accent"
              strokeWidth={2}
            />
          </svg>
        </div>
      ) : null}
    </div>
  );
}

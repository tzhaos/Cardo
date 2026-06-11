import type { CanvasMinimapState } from '../hooks/useCanvasMinimap';

type CanvasMinimapProps = Pick<
  CanvasMinimapState,
  'isOpen' | 'width' | 'height' | 'boxRects' | 'viewportRect' | 'handleMapClick'
>;

export default function CanvasMinimap({ minimap }: { minimap: CanvasMinimapProps }) {
  if (!minimap.isOpen) {
    return null;
  }

  return (
    <div className="fixed right-4 top-16 z-[99990] rounded-xl border border-win-border bg-win-mica p-2 shadow-win-flyout">
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
  );
}

import { cn } from '../../../lib/utils';
import { worldToScreen } from '../../../../core/domains/layout/model/viewport';
import { useCanvasViewport } from '../hooks/useCanvasViewport';
import { useSnapPreview } from '../hooks/useSnapPreview';

export default function SnapOverlay() {
  const snapPreview = useSnapPreview();
  const camera = useCanvasViewport();

  if (!snapPreview) {
    return null;
  }

  return (
    <>
      {snapPreview.guides.map((guide, index) => (
        <div
          key={`${guide.type}-${guide.pos}-${index}`}
          className={cn(
            'absolute z-[99980] bg-win-accent/60 pointer-events-none',
            guide.type === 'vertical' ? 'top-0 h-full w-px' : 'left-0 h-px w-full',
          )}
          style={{
            [guide.type === 'vertical' ? 'left' : 'top']:
              guide.pos + (guide.type === 'vertical' ? camera.panX : camera.panY),
            boxShadow: '0 0 12px color-mix(in srgb, var(--color-win-accent) 42%, transparent)',
          }}
        />
      ))}

      <div
        className="absolute z-[99970] rounded-[24px] border border-win-accent bg-win-active/35 transition-all duration-100 pointer-events-none"
        style={{
          left: worldToScreen(snapPreview, camera).x,
          top: worldToScreen(snapPreview, camera).y,
          width: snapPreview.width,
          height: snapPreview.height,
        }}
      />
    </>
  );
}

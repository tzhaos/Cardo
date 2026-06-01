import { cn } from '../../../lib/utils';
import { useSnapPreview } from '../hooks/useSnapPreview';

export default function SnapOverlay() {
  const snapPreview = useSnapPreview();

  if (!snapPreview) {
    return null;
  }

  return (
    <>
      {snapPreview.guides.map((guide, index) => (
        <div
          key={`${guide.type}-${guide.pos}-${index}`}
          className={cn(
            'absolute z-[99980] bg-win-accent/50 pointer-events-none',
            guide.type === 'vertical' ? 'top-0 h-full w-px' : 'left-0 h-px w-full',
          )}
          style={{
            [guide.type === 'vertical' ? 'left' : 'top']: guide.pos,
            boxShadow: '0 0 8px color-mix(in srgb, var(--color-win-accent) 50%, transparent)',
          }}
        />
      ))}

      <div
        className="absolute z-[99970] rounded-xl border-2 border-win-accent/50 bg-win-accent/10 transition-all duration-100 pointer-events-none"
        style={{
          left: snapPreview.x,
          top: snapPreview.y,
          width: snapPreview.width,
          height: snapPreview.height,
        }}
      />
    </>
  );
}

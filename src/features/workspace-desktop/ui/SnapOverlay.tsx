import { useUIStore } from '../../../domains/ui/store/useUIStore';
import { cn } from '../../../lib/utils';

export default function SnapOverlay() {
  const snapPreview = useUIStore((state) => state.snapPreview);

  if (!snapPreview) {
    return null;
  }

  return (
    <>
      {snapPreview.guides.map((guide, index) => (
        <div
          key={`${guide.type}-${guide.pos}-${index}`}
          className={cn(
            'absolute z-[99980] bg-blue-400/50 shadow-[0_0_8px_rgba(96,165,250,0.5)] pointer-events-none',
            guide.type === 'vertical' ? 'top-0 h-full w-px' : 'left-0 h-px w-full',
          )}
          style={{ [guide.type === 'vertical' ? 'left' : 'top']: guide.pos }}
        />
      ))}

      <div
        className="absolute z-[99970] rounded-xl border-2 border-blue-400/50 bg-blue-400/10 transition-all duration-100 pointer-events-none"
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

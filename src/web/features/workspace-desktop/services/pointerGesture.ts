export interface PointerGestureStart {
  clientX: number;
  clientY: number;
}

interface PointerGestureOptions {
  onMove: (event: PointerEvent) => void;
  onEnd: () => void;
}

export function startDocumentPointerGesture({ onMove, onEnd }: PointerGestureOptions) {
  const handlePointerUp = () => {
    cleanup();
    onEnd();
  };

  const cleanup = () => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', handlePointerUp);
    document.removeEventListener('pointercancel', handlePointerUp);
  };

  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', handlePointerUp);
  document.addEventListener('pointercancel', handlePointerUp);

  return cleanup;
}

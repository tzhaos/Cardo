import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { useCanvasStore } from '../../../app/stores/useCanvasStore';
import { startDocumentPointerGesture } from '../services/pointerGesture';

interface PanStart {
  clientX: number;
  clientY: number;
}

export function useCanvasPan() {
  const panBy = useCanvasStore((state) => state.panBy);
  const isLocked = useCanvasStore((state) => state.isLocked);
  const isPanModifierActive = useCanvasStore((state) => state.isPanModifierActive);
  const setInteractionMode = useCanvasStore((state) => state.setInteractionMode);
  const panStartRef = useRef<PanStart | null>(null);

  const handleCanvasPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      event.button !== 0 ||
      isLocked ||
      (!isPanModifierActive && event.currentTarget !== event.target)
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    panStartRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
    };
    setInteractionMode('panning');

    startDocumentPointerGesture({
      onMove: (moveEvent) => {
        const panStart = panStartRef.current;

        if (!panStart) {
          return;
        }

        const deltaX = moveEvent.clientX - panStart.clientX;
        const deltaY = moveEvent.clientY - panStart.clientY;

        if (deltaX !== 0 || deltaY !== 0) {
          panBy(deltaX, deltaY);
        }

        panStartRef.current = {
          clientX: moveEvent.clientX,
          clientY: moveEvent.clientY,
        };
      },
      onEnd: () => {
        panStartRef.current = null;
        setInteractionMode('idle');
      },
    });
  };

  return {
    handleCanvasPointerDown,
  };
}

import type { MouseEvent as ReactMouseEvent } from 'react';
import type { BoxData } from '../../../types/box';
import { useUIStore } from '../../../domains/ui/store/useUIStore';

interface UseBoxResizeOptions {
  box: BoxData;
  onUpdate: (updates: Partial<BoxData>) => void;
}

export function useBoxResize({ box, onUpdate }: UseBoxResizeOptions) {
  const handleResize = (event: ReactMouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (box.isLocked || useUIStore.getState().editingSessionId) {
      return;
    }

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = box.width;
    const startHeight = box.height;

    const onMouseMove = (moveEvent: MouseEvent) => {
      let newWidth = Math.max(200, startWidth + moveEvent.clientX - startX);
      let newHeight = Math.max(150, startHeight + moveEvent.clientY - startY);

      newWidth = Math.round(newWidth / 20) * 20;
      newHeight = Math.round(newHeight / 20) * 20;
      onUpdate({ width: newWidth, height: newHeight });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return { handleResize };
}

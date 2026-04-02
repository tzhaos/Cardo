import type { MouseEvent as ReactMouseEvent } from 'react';
import type { WorkspaceBox } from '../../../domains/workspace/model/workspace';
import { useInteractionStore } from '../../../app/stores/useInteractionStore';

interface UseBoxResizeOptions {
  box: WorkspaceBox;
  onUpdate: (updates: { bounds: Partial<WorkspaceBox['bounds']> }) => void;
}

export function useBoxResize({ box, onUpdate }: UseBoxResizeOptions) {
  const handleResize = (event: ReactMouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (box.isLocked || useInteractionStore.getState().editingSessionId) {
      return;
    }

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = box.bounds.width;
    const startHeight = box.bounds.height;

    const onMouseMove = (moveEvent: MouseEvent) => {
      let newWidth = Math.max(200, startWidth + moveEvent.clientX - startX);
      let newHeight = Math.max(150, startHeight + moveEvent.clientY - startY);

      newWidth = Math.round(newWidth / 20) * 20;
      newHeight = Math.round(newHeight / 20) * 20;
      onUpdate({ bounds: { width: newWidth, height: newHeight } });
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

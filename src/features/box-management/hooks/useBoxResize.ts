import type { MouseEvent as ReactMouseEvent } from 'react';
import { computeResizedBoxDimensions } from '../../../domains/layout/services/computeResizedBoxDimensions';
import type { WorkspaceBox } from '../../../domains/workspace/model/workspace';
import { useInteractionStore } from '../../../app/stores/useInteractionStore';

const RESIZE_MIN = { width: 200, height: 150 } as const;
const RESIZE_GRID = 20;

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

    const resizeStart = {
      clientX: event.clientX,
      clientY: event.clientY,
      width: box.bounds.width,
      height: box.bounds.height,
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      const { width, height } = computeResizedBoxDimensions(moveEvent, resizeStart, {
        minWidth: RESIZE_MIN.width,
        minHeight: RESIZE_MIN.height,
        grid: RESIZE_GRID,
      });
      onUpdate({ bounds: { width, height } });
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

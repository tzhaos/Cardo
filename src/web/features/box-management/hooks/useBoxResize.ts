import type { MouseEvent as ReactMouseEvent } from 'react';
import { computeResizedBoxDimensions } from '../../../../core/domains/layout/services/computeResizedBoxDimensions';
import {
  BOX_MIN_HEIGHT,
  BOX_MIN_WIDTH,
  type WorkspaceBox,
} from '../../../../core/domains/workspace/model/workspace';
import { hasEditingSession } from '../../../app/controllers/interactionController';
import { useCanvasStore } from '../../../app/stores/useCanvasStore';
const RESIZE_GRID = 20;

interface UseBoxResizeOptions {
  box: WorkspaceBox;
  onUpdate: (updates: { bounds: Partial<WorkspaceBox['bounds']> }) => void;
}

export function useBoxResize({ box, onUpdate }: UseBoxResizeOptions) {
  const setInteractionMode = useCanvasStore((state) => state.setInteractionMode);

  const handleResize = (event: ReactMouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (box.isLocked || box.isCollapsed || hasEditingSession()) {
      return;
    }

    setInteractionMode('box-resizing');

    const resizeStart = {
      clientX: event.clientX,
      clientY: event.clientY,
      width: box.bounds.width,
      height: box.bounds.height,
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      const { width, height } = computeResizedBoxDimensions(moveEvent, resizeStart, {
        minWidth: BOX_MIN_WIDTH,
        minHeight: BOX_MIN_HEIGHT,
        grid: RESIZE_GRID,
      });
      onUpdate({ bounds: { width, height } });
    };

    const onMouseUp = () => {
      setInteractionMode('idle');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return { handleResize };
}

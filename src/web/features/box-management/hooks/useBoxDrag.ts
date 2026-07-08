import type { PointerEvent as ReactPointerEvent } from 'react';
import { useRef } from 'react';
import { computeBoxDragFrame } from '../../../../core/domains/layout/services/computeBoxDragFrame';
import {
  getRenderedBoxBounds,
  type WorkspaceBox,
} from '../../../../core/domains/workspace/model/workspace';
import { hasEditingSession, setSnapPreview } from '../../../app/controllers/interactionController';
import { useCanvasStore } from '../../../app/stores/useCanvasStore';

interface UseBoxDragOptions {
  box: WorkspaceBox;
  allBoxes: WorkspaceBox[];
  onFocus: () => void;
  onUpdate: (updates: { bounds: Partial<WorkspaceBox['bounds']> }) => void;
  setIsDragging: (isDragging: boolean) => void;
}

const EDGE_BOUNDARY_GAP = 28;

function getDragLayoutBounds(target: EventTarget | null, boxWidth: number) {
  if (!(target instanceof Element)) {
    return { minX: EDGE_BOUNDARY_GAP, minY: 0 };
  }

  const boxNode = target.closest<HTMLElement>('[data-kb-box-id]');
  const canvasNode = boxNode?.parentElement;
  const canvasWidth = canvasNode?.clientWidth ?? window.innerWidth;

  return {
    minX: EDGE_BOUNDARY_GAP,
    minY: 0,
    maxX: Math.max(EDGE_BOUNDARY_GAP, canvasWidth - boxWidth - EDGE_BOUNDARY_GAP),
  };
}

export function useBoxDrag({ box, allBoxes, onFocus, onUpdate, setIsDragging }: UseBoxDragOptions) {
  const lastSnapRef = useRef<string | null>(null);
  const setInteractionMode = useCanvasStore((state) => state.setInteractionMode);

  const handleDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.button !== 0 || !event.isPrimary || box.isLocked || hasEditingSession()) {
      return;
    }

    setIsDragging(true);
    setInteractionMode('box-dragging');
    onFocus();
    const renderedBounds = getRenderedBoxBounds(box);
    const layoutBounds = getDragLayoutBounds(event.target, renderedBounds.width);
    const draggableBox = {
      ...box,
      bounds: renderedBounds,
    };

    const dragStart = {
      clientX: event.clientX,
      clientY: event.clientY,
      initialBoxX: box.bounds.x,
      initialBoxY: box.bounds.y,
    };
    let hasFinished = false;

    const updateDragFrame = (moveEvent: { clientX: number; clientY: number }) => {
      const { newX, newY, snap } = computeBoxDragFrame(
        moveEvent,
        dragStart,
        draggableBox,
        allBoxes,
        layoutBounds,
      );

      onUpdate({ bounds: { x: newX, y: newY } });

      const snapKey = `${snap.x},${snap.y}`;

      if (lastSnapRef.current === snapKey) {
        return;
      }

      lastSnapRef.current = snapKey;
      setSnapPreview({
        x: snap.x,
        y: snap.y,
        width: renderedBounds.width,
        height: renderedBounds.height,
        guides: snap.guides,
      });
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== event.pointerId) {
        return;
      }

      updateDragFrame(moveEvent);
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      updateDragFrame(moveEvent);
    };

    const cleanupDragListeners = () => {
      window.removeEventListener('pointermove', handlePointerMove, true);
      window.removeEventListener('pointerup', finishDrag, true);
      window.removeEventListener('pointercancel', cancelDrag, true);
      window.removeEventListener('mousemove', handleMouseMove, true);
      window.removeEventListener('mouseup', finishDragFromMouse, true);
      window.removeEventListener('blur', cancelDrag);
    };

    const completeDrag = (shouldSnap: boolean) => {
      if (hasFinished) {
        return;
      }

      hasFinished = true;
      cleanupDragListeners();
      setIsDragging(false);
      setInteractionMode('idle');

      if (shouldSnap && lastSnapRef.current) {
        const [snappedX, snappedY] = lastSnapRef.current.split(',').map(Number);
        onUpdate({ bounds: { x: snappedX, y: snappedY } });
      }

      lastSnapRef.current = null;
      setSnapPreview(null);
    };

    const finishDrag = (finishEvent: PointerEvent) => {
      if (finishEvent.pointerId !== event.pointerId) {
        return;
      }

      completeDrag(true);
    };

    const finishDragFromMouse = () => {
      completeDrag(true);
    };

    const cancelDrag = () => {
      completeDrag(false);
    };

    window.addEventListener('pointermove', handlePointerMove, true);
    window.addEventListener('pointerup', finishDrag, true);
    window.addEventListener('pointercancel', cancelDrag, true);
    window.addEventListener('mousemove', handleMouseMove, true);
    window.addEventListener('mouseup', finishDragFromMouse, true);
    window.addEventListener('blur', cancelDrag);
  };

  return { handleDragStart };
}

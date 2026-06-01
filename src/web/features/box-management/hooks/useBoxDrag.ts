import type { PointerEvent as ReactPointerEvent } from 'react';
import { useRef } from 'react';
import { computeBoxDragFrame } from '../../../../core/domains/layout/services/computeBoxDragFrame';
import {
  getRenderedBoxBounds,
  type WorkspaceBox,
} from '../../../../core/domains/workspace/model/workspace';
import { hasEditingSession, setSnapPreview } from '../../../app/controllers/interactionController';

interface UseBoxDragOptions {
  box: WorkspaceBox;
  allBoxes: WorkspaceBox[];
  onFocus: () => void;
  onUpdate: (updates: { bounds: Partial<WorkspaceBox['bounds']> }) => void;
  setIsDragging: (isDragging: boolean) => void;
}

export function useBoxDrag({ box, allBoxes, onFocus, onUpdate, setIsDragging }: UseBoxDragOptions) {
  const lastSnapRef = useRef<string | null>(null);

  const handleDragStart = (event: ReactPointerEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (box.isLocked || hasEditingSession()) {
      return;
    }

    setIsDragging(true);
    onFocus();
    const renderedBounds = getRenderedBoxBounds(box);
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

    const onPointerMove = (moveEvent: PointerEvent) => {
      const { newX, newY, snap } = computeBoxDragFrame(
        moveEvent,
        dragStart,
        draggableBox,
        allBoxes,
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

    const onPointerUp = () => {
      setIsDragging(false);

      if (lastSnapRef.current) {
        const [snappedX, snappedY] = lastSnapRef.current.split(',').map(Number);
        onUpdate({ bounds: { x: snappedX, y: snappedY } });
      }

      lastSnapRef.current = null;
      setSnapPreview(null);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  };

  return { handleDragStart };
}

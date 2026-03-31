import type { PointerEvent as ReactPointerEvent } from 'react';
import { useRef } from 'react';
import { calculateSnap } from '../../../domains/layout/services/calculateSnap';
import { useUIStore } from '../../../domains/ui/store/useUIStore';
import { getOrderedBoxes } from '../../../domains/workspace/model/workspaceState';
import { useWorkspaceStore } from '../../../domains/workspace/store/useWorkspaceStore';
import type { BoxData } from '../../../types/box';

interface UseBoxDragOptions {
  box: BoxData;
  onFocus: () => void;
  onUpdate: (updates: Partial<BoxData>) => void;
  setIsDragging: (isDragging: boolean) => void;
}

export function useBoxDrag({ box, onFocus, onUpdate, setIsDragging }: UseBoxDragOptions) {
  const lastSnapRef = useRef<string | null>(null);

  const handleDragStart = (event: ReactPointerEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (box.isLocked || useUIStore.getState().editingSessionId) {
      return;
    }

    setIsDragging(true);
    onFocus();

    const startX = event.clientX;
    const startY = event.clientY;
    const initialBoxX = box.x;
    const initialBoxY = box.y;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const offsetX = moveEvent.clientX - startX;
      const offsetY = moveEvent.clientY - startY;
      const newX = initialBoxX + offsetX;
      const newY = initialBoxY + offsetY;
      const snap = calculateSnap(
        newX,
        newY,
        box.width,
        box.height,
        getOrderedBoxes(useWorkspaceStore.getState()),
        box.id,
      );

      onUpdate({ x: newX, y: newY });

      const snapKey = `${snap.x},${snap.y}`;

      if (lastSnapRef.current === snapKey) {
        return;
      }

      lastSnapRef.current = snapKey;
      useUIStore.getState().setSnapPreview({
        x: snap.x,
        y: snap.y,
        width: box.width,
        height: box.height,
        guides: snap.guides,
      });
    };

    const onPointerUp = () => {
      setIsDragging(false);

      if (lastSnapRef.current) {
        const [snappedX, snappedY] = lastSnapRef.current.split(',').map(Number);
        onUpdate({ x: snappedX, y: snappedY });
      }

      lastSnapRef.current = null;
      useUIStore.getState().setSnapPreview(null);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  };

  return { handleDragStart };
}

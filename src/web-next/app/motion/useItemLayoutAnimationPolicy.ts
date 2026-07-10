import { useEffect, useState } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useUiStore } from '../stores/uiStore';

/**
 * Item layout projection must never run while an ancestor scene is moving.
 * Otherwise Motion can interpret canvas or box coordinates as item reordering.
 */
export function useItemLayoutAnimationPolicy() {
  const isCanvasPanning = useCanvasStore((state) => state.interactionMode === 'panning');
  const isBoxDragging = useUiStore((state) => state.draggedBoxId !== null);
  const sceneIsMoving = isCanvasPanning || isBoxDragging;
  const [sceneHasSettled, setSceneHasSettled] = useState(!sceneIsMoving);

  useEffect(() => {
    if (sceneIsMoving) {
      setSceneHasSettled(false);
      return;
    }

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => setSceneHasSettled(true));
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [sceneIsMoving]);

  return !sceneIsMoving && sceneHasSettled;
}

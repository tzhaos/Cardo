import { useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useUiStore } from './stores/uiStore';
import { useCanvasStore } from './stores/canvasStore';
import { startWindowPointerSession, type WindowPointerSession } from './windowPointerSession';

export function useCanvasPan(pageId: string) {
  const isLocked = useCanvasStore((state) => state.pages[pageId]?.isLocked ?? false);
  const isPanModifierActive = useCanvasStore((state) => state.isPanModifierActive);
  const interactionMode = useCanvasStore((state) => state.interactionMode);
  const panBy = useCanvasStore((state) => state.panBy);
  const setInteractionMode = useCanvasStore((state) => state.setInteractionMode);
  const setPanModifierActive = useCanvasStore((state) => state.setPanModifierActive);
  const selectBox = useUiStore((state) => state.selectBox);
  const pointerSessionRef = useRef<WindowPointerSession | null>(null);

  useEffect(
    () => () => {
      pointerSessionRef.current?.end();
    },
    [],
  );

  useEffect(() => {
    pointerSessionRef.current?.end();
  }, [pageId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.code !== 'Space' ||
        event.repeat ||
        event.defaultPrevented ||
        isEditableTarget(event.target)
      ) {
        return;
      }
      event.preventDefault();
      setPanModifierActive(true);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setPanModifierActive(false);
      }
    };
    const clearModifier = () => setPanModifierActive(false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearModifier);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearModifier);
      setPanModifierActive(false);
    };
  }, [setPanModifierActive]);

  const handlePointerDownCapture = (event: ReactPointerEvent<HTMLElement>) => {
    const target = event.target;
    const startsOnInteractiveControl = isInteractiveControl(target);
    const startsOnBox = target instanceof Element && Boolean(target.closest('[data-canvas-box]'));
    const canStartFromTarget = !startsOnInteractiveControl && (isPanModifierActive || !startsOnBox);

    if (event.button !== 0 || !event.isPrimary || isLocked || !canStartFromTarget) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (!startsOnBox) {
      selectBox(null);
    }
    pointerSessionRef.current?.end();
    setInteractionMode('panning');

    let previousPoint = { x: event.clientX, y: event.clientY };
    const session = startWindowPointerSession({
      pointerId: event.pointerId,
      onMove: (moveEvent) => {
        const delta = {
          x: moveEvent.clientX - previousPoint.x,
          y: moveEvent.clientY - previousPoint.y,
        };
        previousPoint = { x: moveEvent.clientX, y: moveEvent.clientY };
        panBy(pageId, delta);
      },
      onEnd: () => {
        if (pointerSessionRef.current === session) {
          pointerSessionRef.current = null;
        }
        setInteractionMode('idle');
      },
    });
    pointerSessionRef.current = session;
  };

  return {
    handlePointerDownCapture,
    isPanModifierActive,
    isPanning: interactionMode === 'panning',
    isLocked,
  };
}

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
  );
}

function isInteractiveControl(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest('button, input, textarea, select, a, [contenteditable="true"]'))
  );
}

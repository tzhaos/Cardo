import { useEffect, useRef } from 'react';

interface ActivePointer {
  clientX: number;
  clientY: number;
  isPrimary: boolean;
  pointerId: number;
  pointerType: string;
  target: EventTarget | null;
}

export function useCancelActivePointerOnWindowExit() {
  const activePointerRef = useRef<ActivePointer | null>(null);

  useEffect(() => {
    const clearPointer = (event: PointerEvent) => {
      if (activePointerRef.current?.pointerId === event.pointerId) {
        activePointerRef.current = null;
      }
    };
    const cancelActivePointer = () => {
      const activePointer = activePointerRef.current;
      if (!activePointer) {
        return;
      }
      activePointerRef.current = null;

      const target = activePointer.target ?? window;
      if (target instanceof Element && target.hasPointerCapture(activePointer.pointerId)) {
        target.releasePointerCapture(activePointer.pointerId);
      }

      const cancelEvent = new PointerEvent('pointercancel', {
        bubbles: true,
        cancelable: true,
        clientX: activePointer.clientX,
        clientY: activePointer.clientY,
        isPrimary: activePointer.isPrimary,
        pointerId: activePointer.pointerId,
        pointerType: activePointer.pointerType,
      });
      target.dispatchEvent(cancelEvent);
    };
    const onPointerDown = (event: PointerEvent) => {
      activePointerRef.current = {
        clientX: event.clientX,
        clientY: event.clientY,
        isPrimary: event.isPrimary,
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        target: event.target,
      };
    };
    const onPointerMove = (event: PointerEvent) => {
      const activePointer = activePointerRef.current;
      if (activePointer?.pointerId === event.pointerId) {
        activePointer.clientX = event.clientX;
        activePointer.clientY = event.clientY;
      }
    };
    const onPointerOut = (event: PointerEvent) => {
      if (event.relatedTarget === null) {
        cancelActivePointer();
      }
    };
    const onMouseOut = (event: MouseEvent) => {
      if (event.relatedTarget === null) {
        cancelActivePointer();
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        cancelActivePointer();
      }
    };

    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerup', clearPointer, true);
    window.addEventListener('pointercancel', clearPointer, true);
    window.addEventListener('pointerout', onPointerOut, true);
    window.addEventListener('mouseout', onMouseOut, true);
    window.addEventListener('blur', cancelActivePointer);
    document.addEventListener('visibilitychange', onVisibilityChange, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('pointerup', clearPointer, true);
      window.removeEventListener('pointercancel', clearPointer, true);
      window.removeEventListener('pointerout', onPointerOut, true);
      window.removeEventListener('mouseout', onMouseOut, true);
      window.removeEventListener('blur', cancelActivePointer);
      document.removeEventListener('visibilitychange', onVisibilityChange, true);
    };
  }, []);
}

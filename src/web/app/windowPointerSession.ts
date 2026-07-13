export type WindowPointerSessionEndReason =
  | 'pointerup'
  | 'pointercancel'
  | 'window-blur'
  | 'window-leave'
  | 'document-hidden'
  | 'manual';

interface WindowPointerSessionOptions {
  capture?: boolean;
  pointerId?: number;
  onMove: (event: PointerEvent) => void;
  onEnd: (reason: WindowPointerSessionEndReason, event?: Event) => void;
}

export interface WindowPointerSession {
  dispose: () => void;
  end: (reason?: WindowPointerSessionEndReason) => void;
}

export function startWindowPointerSession({
  capture = true,
  pointerId,
  onMove,
  onEnd,
}: WindowPointerSessionOptions): WindowPointerSession {
  let active = true;

  const removeListeners = () => {
    window.removeEventListener('pointermove', onPointerMove, capture);
    window.removeEventListener('pointerup', onPointerUp, capture);
    window.removeEventListener('pointercancel', onPointerCancel, capture);
    window.removeEventListener('pointerout', onPointerOut, true);
    window.removeEventListener('mouseout', onMouseOut, true);
    window.removeEventListener('blur', onWindowBlur);
    document.removeEventListener('visibilitychange', onVisibilityChange, true);
  };

  const finish = (reason: WindowPointerSessionEndReason, event?: Event) => {
    if (!active) {
      return;
    }
    active = false;
    removeListeners();
    onEnd(reason, event);
  };

  function onPointerUp(event: PointerEvent) {
    if (pointerId !== undefined && event.pointerId !== pointerId) {
      return;
    }
    finish('pointerup', event);
  }

  function onPointerCancel(event: PointerEvent) {
    if (pointerId !== undefined && event.pointerId !== pointerId) {
      return;
    }
    finish('pointercancel', event);
  }

  function onPointerMove(event: PointerEvent) {
    if (pointerId === undefined || event.pointerId === pointerId) {
      onMove(event);
    }
  }

  function onPointerOut(event: PointerEvent) {
    if (event.relatedTarget === null) {
      finish('window-leave', event);
    }
  }

  function onMouseOut(event: MouseEvent) {
    if (event.relatedTarget === null) {
      finish('window-leave', event);
    }
  }

  function onWindowBlur(event: FocusEvent) {
    finish('window-blur', event);
  }

  function onVisibilityChange(event: Event) {
    if (document.visibilityState !== 'visible') {
      finish('document-hidden', event);
    }
  }

  window.addEventListener('pointermove', onPointerMove, capture);
  window.addEventListener('pointerup', onPointerUp, capture);
  window.addEventListener('pointercancel', onPointerCancel, capture);
  window.addEventListener('pointerout', onPointerOut, true);
  window.addEventListener('mouseout', onMouseOut, true);
  window.addEventListener('blur', onWindowBlur);
  document.addEventListener('visibilitychange', onVisibilityChange, true);

  return {
    dispose: () => {
      if (!active) {
        return;
      }
      active = false;
      removeListeners();
    },
    end: (reason = 'manual') => finish(reason),
  };
}

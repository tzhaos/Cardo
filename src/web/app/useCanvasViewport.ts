import { useEffect } from 'react';
import type { RefObject } from 'react';
import { useCanvasStore } from './stores/canvasStore';
import { useWorkspaceStore } from './stores/workspaceStore';

const RESIZE_COMMIT_DELAY = 180;

export function useCanvasViewport(canvasRef: RefObject<HTMLElement | null>) {
  const setViewportSize = useCanvasStore((state) => state.setViewportSize);
  const constrainFramesToViewport = useWorkspaceStore((state) => state.constrainFramesToViewport);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let timeoutId: number | null = null;
    let latestViewport = readViewport(canvas);
    setViewportSize(latestViewport);
    constrainFramesToViewport(latestViewport);

    const scheduleCommit = () => {
      latestViewport = readViewport(canvas);
      setViewportSize(latestViewport);
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        timeoutId = null;
        constrainFramesToViewport(latestViewport);
      }, RESIZE_COMMIT_DELAY);
    };

    const observer = new ResizeObserver(scheduleCommit);
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [canvasRef, constrainFramesToViewport, setViewportSize]);
}

function readViewport(canvas: HTMLElement) {
  return { width: canvas.clientWidth, height: canvas.clientHeight };
}

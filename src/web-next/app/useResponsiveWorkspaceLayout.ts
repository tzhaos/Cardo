import { useEffect } from 'react';
import type { RefObject } from 'react';
import { useWorkspaceStore } from './stores/workspaceStore';

const RESIZE_COMMIT_DELAY = 180;

export function useResponsiveWorkspaceLayout(canvasRef: RefObject<HTMLElement | null>) {
  const updateViewport = useWorkspaceStore((state) => state.updateViewport);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let timeoutId: number | null = null;
    let latestViewport = readViewport(canvas);
    updateViewport(latestViewport);

    const scheduleCommit = () => {
      latestViewport = readViewport(canvas);
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        timeoutId = null;
        updateViewport(latestViewport);
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
  }, [canvasRef, updateViewport]);
}

function readViewport(canvas: HTMLElement) {
  return { width: canvas.clientWidth, height: canvas.clientHeight };
}

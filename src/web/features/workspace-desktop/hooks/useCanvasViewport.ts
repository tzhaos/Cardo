import { useViewportCamera } from './useViewportCamera';

export function useCanvasViewport() {
  const camera = useViewportCamera();

  return camera;
}

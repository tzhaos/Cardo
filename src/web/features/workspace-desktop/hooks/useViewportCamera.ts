import { useMemo } from 'react';
import type { ViewportCamera } from '../../../../core/domains/layout/model/viewport';
import { useCanvasStore } from '../../../app/stores/useCanvasStore';

export function useViewportCamera(): ViewportCamera {
  const panX = useCanvasStore((state) => state.panX);
  const panY = useCanvasStore((state) => state.panY);

  return useMemo(() => ({ panX, panY }), [panX, panY]);
}

import { useMemo } from 'react';
import { LocateFixed, Lock, Unlock } from 'lucide-react';
import { useCanvasStore } from '../../app/stores/canvasStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { useI18n } from '../../i18n/useI18n';
import type { FloatingMenuItem } from '../floating-menu/menuTypes';

export function useCanvasTools() {
  const activePageId = useWorkspaceStore((state) => state.snapshot.activePageId);
  const panX = useCanvasStore((state) => state.pages[activePageId]?.camera.panX ?? 0);
  const panY = useCanvasStore((state) => state.pages[activePageId]?.camera.panY ?? 0);
  const isLocked = useCanvasStore((state) => state.pages[activePageId]?.isLocked ?? false);
  const resetCamera = useCanvasStore((state) => state.resetCamera);
  const toggleLocked = useCanvasStore((state) => state.toggleLocked);
  const { t } = useI18n();

  const items = useMemo<FloatingMenuItem[]>(
    () => [
      {
        id: 'return-to-origin',
        label: t('canvas.returnToOrigin'),
        icon: <LocateFixed size={16} />,
        disabled: panX === 0 && panY === 0,
        onSelect: () => resetCamera(activePageId),
      },
      {
        id: 'toggle-canvas-lock',
        label: t(isLocked ? 'canvas.unlockViewport' : 'canvas.lockViewport'),
        icon: isLocked ? <Lock size={16} /> : <Unlock size={16} />,
        onSelect: () => toggleLocked(activePageId),
      },
    ],
    [activePageId, isLocked, panX, panY, resetCamera, t, toggleLocked],
  );

  return { isLocked, items };
}

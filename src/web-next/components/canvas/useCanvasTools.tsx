import { useMemo } from 'react';
import { useCanvasStore } from '../../app/stores/canvasStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { useI18n } from '../../i18n/useI18n';
import type { ContextMenuItem } from '../../ui/cardo/context-menu';
import { ThemeIcon } from '../../ui/icons/ThemeIcon';

export function useCanvasTools() {
  const activePageId = useWorkspaceStore((state) => state.projection.activePageId);
  const panX = useCanvasStore((state) => state.pages[activePageId]?.camera.panX ?? 0);
  const panY = useCanvasStore((state) => state.pages[activePageId]?.camera.panY ?? 0);
  const isLocked = useCanvasStore((state) => state.pages[activePageId]?.isLocked ?? false);
  const resetCamera = useCanvasStore((state) => state.resetCamera);
  const toggleLocked = useCanvasStore((state) => state.toggleLocked);
  const { t } = useI18n();

  const items = useMemo<ContextMenuItem[]>(
    () => [
      {
        id: 'return-to-origin',
        label: t('canvas.returnToOrigin'),
        icon: <ThemeIcon name="locate" size={16} />,
        disabled: panX === 0 && panY === 0,
        onSelect: () => resetCamera(activePageId),
      },
      {
        id: 'toggle-canvas-lock',
        label: t(isLocked ? 'canvas.unlockViewport' : 'canvas.lockViewport'),
        icon: isLocked ? (
          <ThemeIcon name="lock" size={16} />
        ) : (
          <ThemeIcon name="unlock" size={16} />
        ),
        onSelect: () => toggleLocked(activePageId),
      },
    ],
    [activePageId, isLocked, panX, panY, resetCamera, t, toggleLocked],
  );

  return { isLocked, items };
}

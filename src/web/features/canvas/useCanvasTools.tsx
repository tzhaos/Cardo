import { useMemo } from 'react';
import { getPageCanvasState, useCanvasStore } from '../../app/stores/canvasStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { createCanvasWorldBounds, getVisibleCanvasWorldBounds } from '../../domain/canvasGeometry';
import { arrangeFreeformBoxes } from '../../domain/placement';
import { isCollectionPageId } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';
import { ThemeIcon } from '../../kit/icon';
import type { ContextMenuItem } from '../../kit/context-menu';

export function useCanvasTools() {
  const activePageId = useWorkspaceStore((state) => state.projection.activePageId);
  const panX = useCanvasStore((state) => state.pages[activePageId]?.camera.panX ?? 0);
  const panY = useCanvasStore((state) => state.pages[activePageId]?.camera.panY ?? 0);
  const isLocked = useCanvasStore((state) => state.pages[activePageId]?.isLocked ?? false);
  const resetCamera = useCanvasStore((state) => state.resetCamera);
  const toggleLocked = useCanvasStore((state) => state.toggleLocked);
  const arrangeBoxesOnPage = useWorkspaceStore((state) => state.arrangeBoxesOnPage);
  const pageBoxCount = useWorkspaceStore(
    (state) => state.projection.boxes.filter((box) => box.pageId === activePageId).length,
  );
  const unlockedBoxCount = useWorkspaceStore(
    (state) =>
      state.projection.boxes.filter((box) => box.pageId === activePageId && !box.isLocked).length,
  );
  const { t } = useI18n();

  const isCollection = isCollectionPageId(activePageId);
  const freeformArrangeAvailable = !isCollection && unlockedBoxCount > 0;

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
        id: 'arrange-boxes',
        label: t('canvas.arrangeBoxes'),
        icon: <ThemeIcon name="layoutGrid" size={16} />,
        disabled: !freeformArrangeAvailable,
        onSelect: () => {
          if (!freeformArrangeAvailable) return;
          const workspace = useWorkspaceStore.getState();
          const canvas = useCanvasStore.getState();
          const pageState = getPageCanvasState(canvas, activePageId);
          const viewport = canvas.viewportSize;
          const canvasBounds = createCanvasWorldBounds(viewport);
          const visible = getVisibleCanvasWorldBounds(pageState.camera, viewport);
          const origin = {
            x: visible.minX + 24,
            y: visible.minY + 24,
          };
          const contentWidth = Math.max(320, visible.width - 48);
          const pageBoxes = workspace.projection.boxes.filter((box) => box.pageId === activePageId);
          const frames = arrangeFreeformBoxes({
            boxes: pageBoxes.map((box) => ({
              id: box.id,
              frame: box.frame,
              isLocked: box.isLocked,
            })),
            origin,
            contentWidth,
            canvasBounds,
          });
          // Only write frames that actually moved.
          const changed: Record<string, (typeof frames)[string]> = {};
          for (const box of pageBoxes) {
            const next = frames[box.id];
            if (!next) continue;
            if (
              next.x === box.frame.x &&
              next.y === box.frame.y &&
              next.width === box.frame.width &&
              next.height === box.frame.height
            ) {
              continue;
            }
            changed[box.id] = next;
          }
          if (Object.keys(changed).length === 0) return;
          arrangeBoxesOnPage(activePageId, changed);
        },
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
    [
      activePageId,
      arrangeBoxesOnPage,
      freeformArrangeAvailable,
      isLocked,
      panX,
      panY,
      resetCamera,
      t,
      toggleLocked,
    ],
  );

  return {
    isLocked,
    items,
    freeformArrangeAvailable,
    pageBoxCount,
  };
}

import { useMemo } from 'react';
import { Boxes, Grid3X3, LayoutDashboard, Maximize2, ScanSearch } from 'lucide-react';
import { getPageCanvasState, useCanvasStore } from '../../app/stores/canvasStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import {
  arrangePageBoxes,
  recoverOffscreenBoxes,
  resolvePageBoxOverlaps,
  snapPageBoxesToGrid,
} from '../../domain/boxLayout';
import { createCanvasWorldBounds, getVisibleCanvasWorldBounds } from '../../domain/canvasGeometry';
import { useI18n } from '../../i18n/useI18n';

export function useCanvasLayoutTools() {
  const snapshot = useWorkspaceStore((state) => state.snapshot);
  const applyPageBoxLayout = useWorkspaceStore((state) => state.applyPageBoxLayout);
  const viewportSize = useCanvasStore((state) => state.viewportSize);
  const fitFrames = useCanvasStore((state) => state.fitFrames);
  const { t } = useI18n();
  const activePageId = snapshot.activePageId;
  const boxes = useMemo(
    () => snapshot.boxes.filter((box) => box.pageId === activePageId),
    [activePageId, snapshot.boxes],
  );
  const canvasBounds = useMemo(() => createCanvasWorldBounds(viewportSize), [viewportSize]);
  const movableBoxCount = boxes.filter((box) => !box.isLocked).length;

  const getCurrentVisibleBounds = () => {
    const canvasState = useCanvasStore.getState();
    return getVisibleCanvasWorldBounds(
      getPageCanvasState(canvasState, activePageId).camera,
      canvasState.viewportSize,
    );
  };

  const items = useMemo(
    () => [
      {
        id: 'auto-arrange',
        label: t('canvas.autoArrange'),
        icon: <LayoutDashboard size={16} />,
        disabled: movableBoxCount < 2,
        onSelect: () =>
          applyPageBoxLayout(
            activePageId,
            arrangePageBoxes(boxes, getCurrentVisibleBounds(), canvasBounds),
          ),
      },
      {
        id: 'snap-grid',
        label: t('canvas.snapToGrid'),
        icon: <Grid3X3 size={16} />,
        disabled: movableBoxCount === 0,
        onSelect: () => applyPageBoxLayout(activePageId, snapPageBoxesToGrid(boxes, canvasBounds)),
      },
      {
        id: 'avoid-overlap',
        label: t('canvas.avoidOverlap'),
        icon: <Boxes size={16} />,
        disabled: movableBoxCount < 2,
        onSelect: () =>
          applyPageBoxLayout(activePageId, resolvePageBoxOverlaps(boxes, canvasBounds)),
      },
      {
        id: 'recover-offscreen',
        label: t('canvas.recoverOffscreen'),
        icon: <ScanSearch size={16} />,
        disabled: boxes.length === 0,
        separatorBefore: true,
        onSelect: () =>
          applyPageBoxLayout(
            activePageId,
            recoverOffscreenBoxes(boxes, getCurrentVisibleBounds(), canvasBounds),
          ),
      },
      {
        id: 'fit-all',
        label: t('canvas.fitAll'),
        icon: <Maximize2 size={16} />,
        disabled: boxes.length === 0,
        onSelect: () =>
          fitFrames(
            activePageId,
            boxes.map((box) => box.frame),
          ),
      },
    ],
    [activePageId, applyPageBoxLayout, boxes, canvasBounds, fitFrames, movableBoxCount, t],
  );

  return { items };
}

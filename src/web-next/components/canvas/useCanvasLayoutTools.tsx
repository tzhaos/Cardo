import { useCallback, useMemo } from 'react';
import {
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  Boxes,
  Grid3X3,
  LayoutDashboard,
  Layers3,
  Maximize2,
  ScanSearch,
  Undo2,
} from 'lucide-react';
import { getPageCanvasState, useCanvasStore } from '../../app/stores/canvasStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import {
  arrangePageBoxes,
  distributePageBoxes,
  groupPageBoxesByContent,
  recoverOffscreenBoxes,
  resolvePageBoxOverlaps,
  snapPageBoxesToGrid,
} from '../../domain/boxLayout';
import { createCanvasWorldBounds, getVisibleCanvasWorldBounds } from '../../domain/canvasGeometry';
import { useI18n } from '../../i18n/useI18n';
import { useFloatingMenu } from '../floating-menu/useFloatingMenu';

export function useCanvasLayoutTools() {
  const snapshot = useWorkspaceStore((state) => state.snapshot);
  const applyPageBoxLayout = useWorkspaceStore((state) => state.applyPageBoxLayout);
  const undo = useWorkspaceStore((state) => state.undo);
  const canUndo = useWorkspaceStore((state) => state.historyPast.length > 0);
  const viewportSize = useCanvasStore((state) => state.viewportSize);
  const fitFrames = useCanvasStore((state) => state.fitFrames);
  const { openMenu } = useFloatingMenu();
  const { t } = useI18n();
  const activePageId = snapshot.activePageId;
  const boxes = useMemo(
    () => snapshot.boxes.filter((box) => box.pageId === activePageId),
    [activePageId, snapshot.boxes],
  );
  const camera = useCanvasStore((state) => getPageCanvasState(state, activePageId).camera);
  const canvasBounds = useMemo(() => createCanvasWorldBounds(viewportSize), [viewportSize]);
  const visibleBounds = useMemo(
    () => getVisibleCanvasWorldBounds(camera, viewportSize),
    [camera, viewportSize],
  );
  const movableBoxCount = boxes.filter((box) => !box.isLocked).length;

  const items = useMemo(
    () => [
      {
        id: 'auto-arrange',
        label: t('canvas.autoArrange'),
        icon: <LayoutDashboard size={16} />,
        disabled: movableBoxCount < 2,
        onSelect: () =>
          applyPageBoxLayout(activePageId, arrangePageBoxes(boxes, visibleBounds, canvasBounds)),
      },
      {
        id: 'snap-grid',
        label: t('canvas.snapToGrid'),
        icon: <Grid3X3 size={16} />,
        disabled: movableBoxCount === 0,
        onSelect: () => applyPageBoxLayout(activePageId, snapPageBoxesToGrid(boxes, canvasBounds)),
      },
      {
        id: 'distribute',
        label: t('canvas.distribute'),
        icon: <AlignHorizontalDistributeCenter size={16} />,
        disabled: movableBoxCount < 3,
        children: [
          {
            id: 'distribute-horizontal',
            label: t('canvas.distributeHorizontal'),
            icon: <AlignHorizontalDistributeCenter size={16} />,
            onSelect: () =>
              applyPageBoxLayout(
                activePageId,
                distributePageBoxes(boxes, 'horizontal', canvasBounds),
              ),
          },
          {
            id: 'distribute-vertical',
            label: t('canvas.distributeVertical'),
            icon: <AlignVerticalDistributeCenter size={16} />,
            onSelect: () =>
              applyPageBoxLayout(
                activePageId,
                distributePageBoxes(boxes, 'vertical', canvasBounds),
              ),
          },
        ],
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
        id: 'group-content',
        label: t('canvas.groupByContent'),
        icon: <Layers3 size={16} />,
        disabled: movableBoxCount < 2,
        onSelect: () =>
          applyPageBoxLayout(
            activePageId,
            groupPageBoxesByContent(boxes, visibleBounds, canvasBounds),
          ),
      },
      {
        id: 'recover-offscreen',
        label: t('canvas.recoverOffscreen'),
        icon: <ScanSearch size={16} />,
        disabled: boxes.every(
          (box) =>
            box.frame.x < visibleBounds.maxX &&
            box.frame.x + box.frame.width > visibleBounds.minX &&
            box.frame.y < visibleBounds.maxY &&
            box.frame.y + box.frame.height > visibleBounds.minY,
        ),
        separatorBefore: true,
        onSelect: () =>
          applyPageBoxLayout(
            activePageId,
            recoverOffscreenBoxes(boxes, visibleBounds, canvasBounds),
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
      {
        id: 'undo-layout',
        label: t('canvas.undoLayout'),
        icon: <Undo2 size={16} />,
        disabled: !canUndo,
        separatorBefore: true,
        onSelect: undo,
      },
    ],
    [
      activePageId,
      applyPageBoxLayout,
      boxes,
      canUndo,
      canvasBounds,
      fitFrames,
      movableBoxCount,
      t,
      undo,
      visibleBounds,
    ],
  );

  const openCanvasLayoutTools = useCallback(
    (x: number, y: number) => openMenu({ id: 'box-layout-tools', x, y, items }),
    [items, openMenu],
  );

  return { items, openCanvasLayoutTools };
}

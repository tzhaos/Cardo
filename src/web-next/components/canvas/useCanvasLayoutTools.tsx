import { useMemo } from 'react';
import { BringToFront, Focus, Grid3X3, LayoutDashboard, LocateFixed } from 'lucide-react';
import { getPageCanvasState, useCanvasStore } from '../../app/stores/canvasStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import {
  arrangePageBoxes,
  recoverOffscreenBoxes,
  resolvePageBoxOverlaps,
  snapPageBoxesToGrid,
} from '../../domain/boxLayout';
import { createCanvasWorldBounds, getVisibleCanvasWorldBounds } from '../../domain/canvasGeometry';
import { isCollectionPageId } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';

export function useCanvasLayoutTools() {
  const snapshot = useWorkspaceStore((state) => state.snapshot);
  const applyPageBoxLayout = useWorkspaceStore((state) => state.applyPageBoxLayout);
  const applyCollectionBoxLayout = useWorkspaceStore((state) => state.applyCollectionBoxLayout);
  const viewportSize = useCanvasStore((state) => state.viewportSize);
  const fitFrames = useCanvasStore((state) => state.fitFrames);
  const { t } = useI18n();
  const activePageId = snapshot.activePageId;
  const isCollection = isCollectionPageId(activePageId);
  const boxes = useMemo(() => {
    if (!isCollection) return snapshot.boxes.filter((box) => box.pageId === activePageId);
    const collectedIds = new Set(snapshot.collectionBoxIds ?? []);
    return snapshot.boxes
      .filter((box) => collectedIds.has(box.id))
      .map((box, index) => ({
        ...box,
        frame: snapshot.collectionViews?.[box.id]?.frame ?? {
          x: 64 + (index % 3) * 350,
          y: 92 + Math.floor(index / 3) * 290,
          width: 320,
          height: 260,
        },
        isLocked: false,
      }));
  }, [
    activePageId,
    isCollection,
    snapshot.boxes,
    snapshot.collectionBoxIds,
    snapshot.collectionViews,
  ]);
  const canvasBounds = useMemo(() => createCanvasWorldBounds(viewportSize), [viewportSize]);
  const movableBoxCount = boxes.filter((box) => !box.isLocked).length;

  const getCurrentVisibleBounds = () => {
    const canvasState = useCanvasStore.getState();
    return getVisibleCanvasWorldBounds(
      getPageCanvasState(canvasState, activePageId).camera,
      canvasState.viewportSize,
    );
  };
  const applyLayout = (
    frames: Record<string, { x: number; y: number; width: number; height: number }>,
  ) => (isCollection ? applyCollectionBoxLayout(frames) : applyPageBoxLayout(activePageId, frames));

  const items = useMemo(
    () => [
      {
        id: 'auto-arrange',
        label: t('canvas.autoArrange'),
        icon: <LayoutDashboard size={16} />,
        disabled: movableBoxCount < 2,
        onSelect: () =>
          applyLayout(arrangePageBoxes(boxes, getCurrentVisibleBounds(), canvasBounds)),
      },
      {
        id: 'snap-grid',
        label: t('canvas.snapToGrid'),
        icon: <Grid3X3 size={16} />,
        disabled: movableBoxCount === 0,
        onSelect: () => applyLayout(snapPageBoxesToGrid(boxes, canvasBounds)),
      },
      {
        id: 'avoid-overlap',
        label: t('canvas.avoidOverlap'),
        icon: <BringToFront size={16} />,
        disabled: movableBoxCount < 2,
        onSelect: () => applyLayout(resolvePageBoxOverlaps(boxes, canvasBounds)),
      },
      {
        id: 'recover-offscreen',
        label: t('canvas.recoverOffscreen'),
        icon: <LocateFixed size={16} />,
        disabled: boxes.length === 0,
        separatorBefore: true,
        onSelect: () =>
          applyLayout(recoverOffscreenBoxes(boxes, getCurrentVisibleBounds(), canvasBounds)),
      },
      {
        id: 'fit-all',
        label: t('canvas.fitAll'),
        icon: <Focus size={16} />,
        disabled: boxes.length === 0,
        onSelect: () =>
          fitFrames(
            activePageId,
            boxes.map((box) => box.frame),
          ),
      },
    ],
    [
      activePageId,
      applyCollectionBoxLayout,
      applyPageBoxLayout,
      boxes,
      canvasBounds,
      fitFrames,
      isCollection,
      movableBoxCount,
      t,
    ],
  );

  return { items };
}

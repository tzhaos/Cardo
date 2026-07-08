import type { MouseEvent as ReactMouseEvent } from 'react';
import { computeResizedBoxDimensions } from '../../../../core/domains/layout/services/computeResizedBoxDimensions';
import {
  BOX_MIN_HEIGHT,
  BOX_MIN_WIDTH,
  type WorkspaceBox,
} from '../../../../core/domains/workspace/model/workspace';
import { hasEditingSession } from '../../../app/controllers/interactionController';
import { useCanvasStore } from '../../../app/stores/useCanvasStore';
const RESIZE_GRID = 20;
const MIN_BOX_GAP = 28;
const EDGE_BOUNDARY_GAP = 28;

interface UseBoxResizeOptions {
  box: WorkspaceBox;
  allBoxes: WorkspaceBox[];
  onUpdate: (updates: { bounds: Partial<WorkspaceBox['bounds']> }) => void;
}

function rangesHaveGapConflict(
  firstStart: number,
  firstEnd: number,
  secondStart: number,
  secondEnd: number,
) {
  return !(firstEnd + MIN_BOX_GAP <= secondStart || secondEnd + MIN_BOX_GAP <= firstStart);
}

function floorToGrid(value: number) {
  return Math.floor(value / RESIZE_GRID) * RESIZE_GRID;
}

function constrainResizedBoxDimensions(
  box: WorkspaceBox,
  allBoxes: WorkspaceBox[],
  width: number,
  height: number,
  maxWidth?: number,
) {
  let nextWidth = maxWidth === undefined ? width : Math.min(width, maxWidth);
  let nextHeight = height;

  for (let pass = 0; pass < 3; pass += 1) {
    for (const other of allBoxes) {
      if (other.id === box.id) {
        continue;
      }

      const hasVerticalConflict = rangesHaveGapConflict(
        box.bounds.y,
        box.bounds.y + nextHeight,
        other.bounds.y,
        other.bounds.y + other.bounds.height,
      );

      if (hasVerticalConflict && other.bounds.x > box.bounds.x) {
        nextWidth = Math.min(
          nextWidth,
          Math.max(BOX_MIN_WIDTH, floorToGrid(other.bounds.x - box.bounds.x - MIN_BOX_GAP)),
        );
      }

      const hasHorizontalConflict = rangesHaveGapConflict(
        box.bounds.x,
        box.bounds.x + nextWidth,
        other.bounds.x,
        other.bounds.x + other.bounds.width,
      );

      if (hasHorizontalConflict && other.bounds.y > box.bounds.y) {
        nextHeight = Math.min(
          nextHeight,
          Math.max(BOX_MIN_HEIGHT, floorToGrid(other.bounds.y - box.bounds.y - MIN_BOX_GAP)),
        );
      }
    }
  }

  return {
    width: nextWidth,
    height: nextHeight,
  };
}

function getResizeMaxWidth(target: EventTarget | null, box: WorkspaceBox) {
  if (!(target instanceof Element)) {
    return undefined;
  }

  const boxNode = target.closest<HTMLElement>('[data-kb-box-id]');
  const canvasNode = boxNode?.parentElement;
  const canvasWidth = canvasNode?.clientWidth;

  return canvasWidth === undefined
    ? undefined
    : Math.max(BOX_MIN_WIDTH, canvasWidth - box.bounds.x - EDGE_BOUNDARY_GAP);
}

export function useBoxResize({ box, allBoxes, onUpdate }: UseBoxResizeOptions) {
  const setInteractionMode = useCanvasStore((state) => state.setInteractionMode);

  const handleResize = (event: ReactMouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (box.isLocked || box.isCollapsed || hasEditingSession()) {
      return;
    }

    setInteractionMode('box-resizing');

    const resizeStart = {
      clientX: event.clientX,
      clientY: event.clientY,
      width: box.bounds.width,
      height: box.bounds.height,
    };
    const maxWidth = getResizeMaxWidth(event.target, box);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const { width, height } = computeResizedBoxDimensions(moveEvent, resizeStart, {
        minWidth: BOX_MIN_WIDTH,
        minHeight: BOX_MIN_HEIGHT,
        grid: RESIZE_GRID,
      });
      onUpdate({ bounds: constrainResizedBoxDimensions(box, allBoxes, width, height, maxWidth) });
    };

    const onMouseUp = () => {
      setInteractionMode('idle');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return { handleResize };
}

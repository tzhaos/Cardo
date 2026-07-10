import { constrainBoxFrameToCanvas, type CanvasWorldBounds } from './canvasGeometry';
import { findAvailableFrame } from './placement';
import type { BoxFrame, WorkspaceBox } from './workspace';

export type BoxFrameUpdates = Record<string, BoxFrame>;

const LAYOUT_GAP = 28;
const GRID_SIZE = 24;

export function arrangePageBoxes(
  boxes: WorkspaceBox[],
  visibleBounds: CanvasWorldBounds,
  canvasBounds: CanvasWorldBounds,
): BoxFrameUpdates {
  const movableBoxes = boxes.filter((box) => !box.isLocked);
  if (!movableBoxes.length) return {};

  const maximumWidth = Math.max(...movableBoxes.map((box) => box.frame.width));
  const maximumHeight = Math.max(...movableBoxes.map((box) => box.frame.height));
  const columns = Math.max(
    1,
    Math.min(
      movableBoxes.length,
      Math.floor((visibleBounds.width + LAYOUT_GAP) / (maximumWidth + LAYOUT_GAP)),
    ),
  );
  const rows = Math.ceil(movableBoxes.length / columns);
  const layoutWidth = columns * maximumWidth + Math.max(0, columns - 1) * LAYOUT_GAP;
  const layoutHeight = rows * maximumHeight + Math.max(0, rows - 1) * LAYOUT_GAP;
  const startX = Math.round(
    visibleBounds.minX + Math.max(24, (visibleBounds.width - layoutWidth) / 2),
  );
  const startY = Math.round(
    visibleBounds.minY + Math.max(24, (visibleBounds.height - layoutHeight) / 2),
  );
  const occupiedFrames = boxes.filter((box) => box.isLocked).map((box) => box.frame);
  const updates: BoxFrameUpdates = {};

  movableBoxes
    .slice()
    .sort((first, second) => first.frame.y - second.frame.y || first.frame.x - second.frame.x)
    .forEach((box, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const preferredFrame = constrainBoxFrameToCanvas(
        {
          ...box.frame,
          x: startX + column * (maximumWidth + LAYOUT_GAP),
          y: startY + row * (maximumHeight + LAYOUT_GAP),
        },
        canvasBounds,
      );
      const frame =
        findAvailableFrame(preferredFrame, occupiedFrames, canvasBounds, LAYOUT_GAP) ??
        preferredFrame;
      occupiedFrames.push(frame);
      updates[box.id] = frame;
    });

  return updates;
}

export function snapPageBoxesToGrid(boxes: WorkspaceBox[], canvasBounds: CanvasWorldBounds) {
  return Object.fromEntries(
    boxes
      .filter((box) => !box.isLocked)
      .map((box) => [
        box.id,
        constrainBoxFrameToCanvas(
          {
            ...box.frame,
            x: Math.round(box.frame.x / GRID_SIZE) * GRID_SIZE,
            y: Math.round(box.frame.y / GRID_SIZE) * GRID_SIZE,
          },
          canvasBounds,
        ),
      ]),
  );
}

export function distributePageBoxes(
  boxes: WorkspaceBox[],
  axis: 'horizontal' | 'vertical',
  canvasBounds: CanvasWorldBounds,
) {
  const movableBoxes = boxes
    .filter((box) => !box.isLocked)
    .sort((first, second) =>
      axis === 'horizontal' ? first.frame.x - second.frame.x : first.frame.y - second.frame.y,
    );
  if (movableBoxes.length < 3) return {};
  const start = axis === 'horizontal' ? movableBoxes[0]!.frame.x : movableBoxes[0]!.frame.y;
  const last = movableBoxes.at(-1)!;
  const end =
    axis === 'horizontal' ? last.frame.x + last.frame.width : last.frame.y + last.frame.height;
  const totalSize = movableBoxes.reduce(
    (sum, box) => sum + (axis === 'horizontal' ? box.frame.width : box.frame.height),
    0,
  );
  const gap = Math.max(0, (end - start - totalSize) / (movableBoxes.length - 1));
  let cursor = start;
  const updates: BoxFrameUpdates = {};
  movableBoxes.forEach((box) => {
    updates[box.id] = constrainBoxFrameToCanvas(
      {
        ...box.frame,
        ...(axis === 'horizontal' ? { x: Math.round(cursor) } : { y: Math.round(cursor) }),
      },
      canvasBounds,
    );
    cursor += (axis === 'horizontal' ? box.frame.width : box.frame.height) + gap;
  });
  return updates;
}

export function resolvePageBoxOverlaps(boxes: WorkspaceBox[], canvasBounds: CanvasWorldBounds) {
  const occupiedFrames = boxes.filter((box) => box.isLocked).map((box) => box.frame);
  const updates: BoxFrameUpdates = {};
  boxes
    .filter((box) => !box.isLocked)
    .slice()
    .sort((first, second) => first.frame.y - second.frame.y || first.frame.x - second.frame.x)
    .forEach((box) => {
      const overlaps = occupiedFrames.some((frame) => framesOverlap(box.frame, frame, LAYOUT_GAP));
      const frame = overlaps
        ? (findAvailableFrame(box.frame, occupiedFrames, canvasBounds, LAYOUT_GAP) ?? box.frame)
        : box.frame;
      occupiedFrames.push(frame);
      updates[box.id] = frame;
    });
  return updates;
}

export function groupPageBoxesByContent(
  boxes: WorkspaceBox[],
  visibleBounds: CanvasWorldBounds,
  canvasBounds: CanvasWorldBounds,
) {
  const categoryOrder = ['folder', 'file', 'shortcut', 'bookmark', 'clipboard', 'mixed', 'empty'];
  const orderedBoxes = boxes.slice().sort((first, second) => {
    const categoryDelta =
      categoryOrder.indexOf(getBoxContentCategory(first)) -
      categoryOrder.indexOf(getBoxContentCategory(second));
    return categoryDelta || first.frame.y - second.frame.y || first.frame.x - second.frame.x;
  });
  return arrangeBoxesInOrder(orderedBoxes, visibleBounds, canvasBounds);
}

export function recoverOffscreenBoxes(
  boxes: WorkspaceBox[],
  visibleBounds: CanvasWorldBounds,
  canvasBounds: CanvasWorldBounds,
) {
  const safeBounds = intersectBounds(visibleBounds, canvasBounds);
  const visibleBoxes = boxes.filter((box) => frameIntersectsBounds(box.frame, safeBounds));
  const occupiedFrames = visibleBoxes.map((box) => box.frame);
  const updates: BoxFrameUpdates = {};
  boxes
    .filter((box) => !box.isLocked && !frameIntersectsBounds(box.frame, safeBounds))
    .forEach((box, index) => {
      const preferredFrame = constrainBoxFrameToCanvas(
        {
          ...box.frame,
          x: safeBounds.minX + 24 + (index % 3) * (box.frame.width + LAYOUT_GAP),
          y: safeBounds.minY + 24 + Math.floor(index / 3) * (box.frame.height + LAYOUT_GAP),
        },
        safeBounds,
      );
      const frame =
        findAvailableFrame(preferredFrame, occupiedFrames, safeBounds, LAYOUT_GAP) ??
        preferredFrame;
      occupiedFrames.push(frame);
      updates[box.id] = frame;
    });
  return updates;
}

function arrangeBoxesInOrder(
  boxes: WorkspaceBox[],
  visibleBounds: CanvasWorldBounds,
  canvasBounds: CanvasWorldBounds,
) {
  const movableBoxes = boxes.filter((box) => !box.isLocked);
  if (!movableBoxes.length) return {};
  const maximumWidth = Math.max(...movableBoxes.map((box) => box.frame.width));
  const maximumHeight = Math.max(...movableBoxes.map((box) => box.frame.height));
  const columns = Math.max(
    1,
    Math.min(
      movableBoxes.length,
      Math.floor((visibleBounds.width + LAYOUT_GAP) / (maximumWidth + LAYOUT_GAP)),
    ),
  );
  const occupiedFrames = boxes.filter((box) => box.isLocked).map((box) => box.frame);
  const updates: BoxFrameUpdates = {};
  movableBoxes.forEach((box, index) => {
    const preferredFrame = constrainBoxFrameToCanvas(
      {
        ...box.frame,
        x: visibleBounds.minX + 24 + (index % columns) * (maximumWidth + LAYOUT_GAP),
        y: visibleBounds.minY + 24 + Math.floor(index / columns) * (maximumHeight + LAYOUT_GAP),
      },
      canvasBounds,
    );
    const frame =
      findAvailableFrame(preferredFrame, occupiedFrames, canvasBounds, LAYOUT_GAP) ??
      preferredFrame;
    occupiedFrames.push(frame);
    updates[box.id] = frame;
  });
  return updates;
}

function getBoxContentCategory(box: WorkspaceBox) {
  if (!box.items.length) return 'empty';
  const counts = new Map<string, number>();
  box.items.forEach((item) => counts.set(item.type, (counts.get(item.type) ?? 0) + 1));
  const sorted = [...counts.entries()].sort((first, second) => second[1] - first[1]);
  return sorted.length > 1 && sorted[0]![1] === sorted[1]![1] ? 'mixed' : sorted[0]![0];
}

function frameIntersectsBounds(frame: BoxFrame, bounds: CanvasWorldBounds) {
  return (
    frame.x < bounds.maxX &&
    frame.x + frame.width > bounds.minX &&
    frame.y < bounds.maxY &&
    frame.y + frame.height > bounds.minY
  );
}

function intersectBounds(first: CanvasWorldBounds, second: CanvasWorldBounds) {
  const minX = Math.max(first.minX, second.minX);
  const minY = Math.max(first.minY, second.minY);
  const maxX = Math.min(first.maxX, second.maxX);
  const maxY = Math.min(first.maxY, second.maxY);
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function framesOverlap(first: BoxFrame, second: BoxFrame, gap: number) {
  return (
    first.x < second.x + second.width + gap &&
    first.x + first.width + gap > second.x &&
    first.y < second.y + second.height + gap &&
    first.y + first.height + gap > second.y
  );
}

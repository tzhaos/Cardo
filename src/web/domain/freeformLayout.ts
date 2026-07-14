import type { BoxFrame } from './workspace';
import type { CanvasWorldBounds } from './canvasGeometry';
import { constrainBoxFrameToCanvas } from './canvasGeometry';

/** Freeform packing grid — positions and sizes snap to this step. */
export const FREEFORM_GRID = 16;
/** Minimum gap between freeform boxes (one grid cell). */
export const FREEFORM_GAP = FREEFORM_GRID;
export const FREEFORM_MIN_WIDTH = 15 * FREEFORM_GRID; // 240
export const FREEFORM_MIN_HEIGHT = 11 * FREEFORM_GRID; // 176

export function snapToFreeformGrid(value: number): number {
  return Math.round(value / FREEFORM_GRID) * FREEFORM_GRID;
}

export function snapSizeToFreeformGrid(value: number, minimum: number): number {
  const snapped = Math.max(minimum, snapToFreeformGrid(value));
  return snapped < minimum
    ? minimum + (FREEFORM_GRID - (minimum % FREEFORM_GRID || FREEFORM_GRID))
    : snapped;
}

export function snapFreeformFrame(frame: BoxFrame, bounds?: CanvasWorldBounds): BoxFrame {
  const snapped: BoxFrame = {
    x: snapToFreeformGrid(frame.x),
    y: snapToFreeformGrid(frame.y),
    width: snapSizeToFreeformGrid(frame.width, FREEFORM_MIN_WIDTH),
    height: snapSizeToFreeformGrid(frame.height, FREEFORM_MIN_HEIGHT),
  };
  return bounds ? constrainBoxFrameToCanvas(snapped, bounds) : snapped;
}

export function framesOverlapWithGap(a: BoxFrame, b: BoxFrame, gap = FREEFORM_GAP): boolean {
  return (
    a.x < b.x + b.width + gap &&
    a.x + a.width + gap > b.x &&
    a.y < b.y + b.height + gap &&
    a.y + a.height + gap > b.y
  );
}

/**
 * Resolve a freeform drop: snap to grid, then push out of occupied rects with min gap.
 */
export function resolveFreeformDropFrame(args: {
  frame: BoxFrame;
  occupied: readonly BoxFrame[];
  bounds: CanvasWorldBounds;
  gap?: number;
}): BoxFrame {
  const gap = args.gap ?? FREEFORM_GAP;
  let next = snapFreeformFrame(args.frame, args.bounds);
  const maxAttempts = 80;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const hit = args.occupied.find((other) => framesOverlapWithGap(next, other, gap));
    if (!hit) return next;
    // Prefer shift right, then down, by one grid step past the blocker.
    const rightX = hit.x + hit.width + gap;
    const belowY = hit.y + hit.height + gap;
    if (rightX + next.width <= args.bounds.maxX) {
      next = snapFreeformFrame({ ...next, x: rightX }, args.bounds);
    } else {
      next = snapFreeformFrame(
        { ...next, x: args.bounds.minX + FREEFORM_GAP, y: belowY },
        args.bounds,
      );
    }
  }
  return next;
}

/** Pack unlocked boxes into a freeform grid (row wrap) with min gap. */
export function arrangeFreeformBoxesGrid(args: {
  boxes: readonly { id: string; frame: BoxFrame; isLocked?: boolean }[];
  origin: { x: number; y: number };
  contentWidth: number;
  bounds: CanvasWorldBounds;
}): Record<string, BoxFrame> {
  const originX = snapToFreeformGrid(args.origin.x);
  const originY = snapToFreeformGrid(args.origin.y);
  const contentWidth = Math.max(FREEFORM_MIN_WIDTH, snapToFreeformGrid(args.contentWidth));
  const frames: Record<string, BoxFrame> = {};
  const movable = args.boxes
    .filter((box) => !box.isLocked)
    .slice()
    .sort((a, b) => {
      if (a.frame.y !== b.frame.y) return a.frame.y - b.frame.y;
      if (a.frame.x !== b.frame.x) return a.frame.x - b.frame.x;
      return a.id.localeCompare(b.id);
    });

  for (const box of args.boxes) {
    if (box.isLocked) frames[box.id] = snapFreeformFrame(box.frame, args.bounds);
  }

  let x = originX;
  let y = originY;
  let rowHeight = 0;

  for (const box of movable) {
    const size = snapFreeformFrame(box.frame, args.bounds);
    if (x > originX && x + size.width > originX + contentWidth) {
      x = originX;
      y += rowHeight + FREEFORM_GAP;
      rowHeight = 0;
    }
    frames[box.id] = constrainBoxFrameToCanvas(
      { x, y, width: size.width, height: size.height },
      args.bounds,
    );
    x += size.width + FREEFORM_GAP;
    rowHeight = Math.max(rowHeight, size.height);
  }
  return frames;
}

/** Startup / import: snap all freeform frames and separate overlaps. */
export function sanitizeFreeformPageFrames(
  boxes: readonly { id: string; frame: BoxFrame; isLocked?: boolean }[],
  bounds: CanvasWorldBounds,
): Record<string, BoxFrame> {
  const ordered = boxes.slice().sort((a, b) => {
    if (a.frame.y !== b.frame.y) return a.frame.y - b.frame.y;
    if (a.frame.x !== b.frame.x) return a.frame.x - b.frame.x;
    return a.id.localeCompare(b.id);
  });
  const placed: { id: string; frame: BoxFrame }[] = [];
  const result: Record<string, BoxFrame> = {};

  for (const box of ordered) {
    const frame = resolveFreeformDropFrame({
      frame: box.frame,
      occupied: placed.map((entry) => entry.frame),
      bounds,
    });
    placed.push({ id: box.id, frame });
    result[box.id] = frame;
  }
  return result;
}

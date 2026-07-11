import { createDefaultBoxFrameCenteredAt } from '../../core/domains/layout/boxDefaults';
import {
  constrainBoxFrameToCanvas,
  type CanvasPoint,
  type CanvasWorldBounds,
} from './canvasGeometry';
import type { BoxFrame, WorkspaceProjection } from './workspace';

const BOX_GAP = 24;
const SEARCH_STEP = 24;
const VIEWPORT_MARGIN = 16;

export function createBoxFrameCenteredAt(point: CanvasPoint): BoxFrame {
  return createDefaultBoxFrameCenteredAt(point);
}

export function findNewBoxFrame(
  projection: WorkspaceProjection,
  pageId: string,
  preferredCenter: CanvasPoint,
  bounds: CanvasWorldBounds,
) {
  const preferredFrame = constrainBoxFrameToCanvas(
    createBoxFrameCenteredAt(preferredCenter),
    bounds,
  );
  const occupiedFrames = projection.boxes
    .filter((box) => box.pageId === pageId)
    .map((box) => box.frame);
  return findAvailableFrame(preferredFrame, occupiedFrames, bounds) ?? preferredFrame;
}

export function findPageLandingFrame(
  projection: WorkspaceProjection,
  boxId: string,
  pageId: string,
  preferredCenter: CanvasPoint,
  bounds: CanvasWorldBounds,
): BoxFrame | null {
  const movingBox = projection.boxes.find((box) => box.id === boxId);
  if (!movingBox) {
    return null;
  }

  return findViewportAdaptiveFrame({
    size: { width: movingBox.frame.width, height: movingBox.frame.height },
    preferredCenter,
    viewportBounds: bounds,
    canvasBounds: bounds,
    occupiedFrames: projection.boxes
      .filter((box) => box.pageId === pageId && box.id !== boxId)
      .map((box) => box.frame),
  });
}

/**
 * Place a box inside the current viewport:
 * 1. Prefer a free slot near preferredCenter (no overlap, with gap).
 * 2. If the viewport is full, choose the lowest-overlap slot among existing boxes.
 * Always clamp to both the visible viewport and the canvas world bounds.
 */
export function findViewportAdaptiveFrame({
  size,
  preferredCenter,
  viewportBounds,
  canvasBounds,
  occupiedFrames,
  gap = BOX_GAP,
}: {
  size: { width: number; height: number };
  preferredCenter: CanvasPoint;
  viewportBounds: CanvasWorldBounds;
  canvasBounds: CanvasWorldBounds;
  occupiedFrames: BoxFrame[];
  gap?: number;
}): BoxFrame {
  const placementBounds = intersectBounds(viewportBounds, canvasBounds, VIEWPORT_MARGIN);
  const preferredFrame = constrainBoxFrameToCanvas(
    {
      x: Math.round(preferredCenter.x - size.width / 2),
      y: Math.round(preferredCenter.y - size.height / 2),
      width: size.width,
      height: size.height,
    },
    placementBounds,
  );

  return (
    findAvailableFrame(preferredFrame, occupiedFrames, placementBounds, gap) ??
    findLowestOverlapFrame(preferredFrame, occupiedFrames, placementBounds)
  );
}

export function isFrameFreeInViewport(
  frame: BoxFrame,
  viewportBounds: CanvasWorldBounds,
  occupiedFrames: BoxFrame[],
  gap = BOX_GAP,
) {
  const padded = insetBounds(viewportBounds, VIEWPORT_MARGIN);
  if (!frameContainedBy(frame, padded)) return false;
  return occupiedFrames.every((occupied) => !framesOverlap(frame, occupied, gap));
}

export function findAvailableFrame(
  preferredFrame: BoxFrame,
  occupiedFrames: BoxFrame[],
  bounds: CanvasWorldBounds,
  gap = BOX_GAP,
) {
  const visited = new Set<string>();
  const maximumRadius = Math.ceil(Math.max(bounds.width, bounds.height) / SEARCH_STEP);

  for (let radius = 0; radius <= maximumRadius; radius += 1) {
    for (const offset of createRingOffsets(radius)) {
      const candidate = constrainBoxFrameToCanvas(
        {
          ...preferredFrame,
          x: preferredFrame.x + offset.x * SEARCH_STEP,
          y: preferredFrame.y + offset.y * SEARCH_STEP,
        },
        bounds,
      );
      const key = `${candidate.x},${candidate.y}`;
      if (visited.has(key)) {
        continue;
      }
      visited.add(key);

      if (occupiedFrames.every((frame) => !framesOverlap(candidate, frame, gap))) {
        return candidate;
      }
    }
  }

  return null;
}

function createRingOffsets(radius: number) {
  if (radius === 0) {
    return [{ x: 0, y: 0 }];
  }

  const offsets: CanvasPoint[] = [];
  for (let x = -radius; x <= radius; x += 1) {
    offsets.push({ x, y: -radius }, { x, y: radius });
  }
  for (let y = -radius + 1; y < radius; y += 1) {
    offsets.push({ x: -radius, y }, { x: radius, y });
  }
  return offsets;
}

function findLowestOverlapFrame(
  preferredFrame: BoxFrame,
  occupiedFrames: BoxFrame[],
  bounds: CanvasWorldBounds,
) {
  let bestFrame = preferredFrame;
  let bestOverlap = Number.POSITIVE_INFINITY;
  let bestDistance = Number.POSITIVE_INFINITY;
  const maximumX = Math.max(bounds.minX, bounds.maxX - preferredFrame.width);
  const maximumY = Math.max(bounds.minY, bounds.maxY - preferredFrame.height);

  for (let y = bounds.minY; y <= maximumY; y += SEARCH_STEP) {
    for (let x = bounds.minX; x <= maximumX; x += SEARCH_STEP) {
      const candidate = { ...preferredFrame, x: Math.round(x), y: Math.round(y) };
      const overlap = occupiedFrames.reduce(
        (total, frame) => total + getOverlapArea(candidate, frame),
        0,
      );
      const distance = Math.hypot(candidate.x - preferredFrame.x, candidate.y - preferredFrame.y);
      if (overlap < bestOverlap || (overlap === bestOverlap && distance < bestDistance)) {
        bestFrame = candidate;
        bestOverlap = overlap;
        bestDistance = distance;
      }
    }
  }

  return bestFrame;
}

function getOverlapArea(first: BoxFrame, second: BoxFrame) {
  const width = Math.max(
    0,
    Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x),
  );
  const height = Math.max(
    0,
    Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y),
  );
  return width * height;
}

function framesOverlap(first: BoxFrame, second: BoxFrame, gap: number) {
  return (
    first.x < second.x + second.width + gap &&
    first.x + first.width + gap > second.x &&
    first.y < second.y + second.height + gap &&
    first.y + first.height + gap > second.y
  );
}

function frameContainedBy(frame: BoxFrame, bounds: CanvasWorldBounds) {
  return (
    frame.x >= bounds.minX &&
    frame.y >= bounds.minY &&
    frame.x + frame.width <= bounds.maxX &&
    frame.y + frame.height <= bounds.maxY
  );
}

function insetBounds(bounds: CanvasWorldBounds, margin: number): CanvasWorldBounds {
  const minX = bounds.minX + margin;
  const minY = bounds.minY + margin;
  const maxX = bounds.maxX - margin;
  const maxY = bounds.maxY - margin;
  return {
    minX,
    minY,
    maxX: Math.max(minX, maxX),
    maxY: Math.max(minY, maxY),
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };
}

function intersectBounds(
  first: CanvasWorldBounds,
  second: CanvasWorldBounds,
  margin = 0,
): CanvasWorldBounds {
  const minX = Math.max(first.minX, second.minX) + margin;
  const minY = Math.max(first.minY, second.minY) + margin;
  const maxX = Math.min(first.maxX, second.maxX) - margin;
  const maxY = Math.min(first.maxY, second.maxY) - margin;
  return {
    minX,
    minY,
    maxX: Math.max(minX, maxX),
    maxY: Math.max(minY, maxY),
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };
}

import {
  constrainBoxFrameToCanvas,
  type CanvasPoint,
  type CanvasWorldBounds,
} from './canvasGeometry';
import type { BoxFrame, WorkspaceProjection } from './workspace';

const BOX_GAP = 24;
const SEARCH_STEP = 24;
const DEFAULT_BOX_WIDTH = 320;
const DEFAULT_BOX_HEIGHT = 240;

export function createBoxFrameCenteredAt(point: CanvasPoint): BoxFrame {
  return {
    x: Math.round(point.x - DEFAULT_BOX_WIDTH / 2),
    y: Math.round(point.y - DEFAULT_BOX_HEIGHT / 2),
    width: DEFAULT_BOX_WIDTH,
    height: DEFAULT_BOX_HEIGHT,
  };
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

  const { width, height } = movingBox.frame;
  const preferredFrame = constrainBoxFrameToCanvas(
    {
      x: Math.round(preferredCenter.x - width / 2),
      y: Math.round(preferredCenter.y - height / 2),
      width,
      height,
    },
    bounds,
  );
  const occupiedFrames = projection.boxes
    .filter((box) => box.pageId === pageId && box.id !== boxId)
    .map((box) => box.frame);

  return (
    findAvailableFrame(preferredFrame, occupiedFrames, bounds) ??
    findLowestOverlapFrame(preferredFrame, occupiedFrames, bounds)
  );
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

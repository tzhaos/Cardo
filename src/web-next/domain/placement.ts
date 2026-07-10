import {
  constrainBoxFrameToCanvas,
  type CanvasPoint,
  type CanvasWorldBounds,
} from './canvasGeometry';
import type { BoxFrame, WorkspaceSnapshot } from './workspace';

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
  snapshot: WorkspaceSnapshot,
  pageId: string,
  preferredCenter: CanvasPoint,
  bounds: CanvasWorldBounds,
) {
  const preferredFrame = constrainBoxFrameToCanvas(
    createBoxFrameCenteredAt(preferredCenter),
    bounds,
  );
  const occupiedFrames = snapshot.boxes
    .filter((box) => box.pageId === pageId)
    .map((box) => box.frame);
  return findAvailableFrame(preferredFrame, occupiedFrames, bounds) ?? preferredFrame;
}

export function findPageLandingFrame(
  snapshot: WorkspaceSnapshot,
  boxId: string,
  pageId: string,
  preferredCenter: CanvasPoint,
  bounds: CanvasWorldBounds,
): BoxFrame | null {
  const movingBox = snapshot.boxes.find((box) => box.id === boxId);
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
  const occupiedFrames = snapshot.boxes
    .filter((box) => box.pageId === pageId && box.id !== boxId)
    .map((box) => box.frame);

  return findAvailableFrame(preferredFrame, occupiedFrames, bounds) ?? preferredFrame;
}

function findAvailableFrame(
  preferredFrame: BoxFrame,
  occupiedFrames: BoxFrame[],
  bounds: CanvasWorldBounds,
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

      if (occupiedFrames.every((frame) => !framesOverlap(candidate, frame, BOX_GAP))) {
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

function framesOverlap(first: BoxFrame, second: BoxFrame, gap: number) {
  return (
    first.x < second.x + second.width + gap &&
    first.x + first.width + gap > second.x &&
    first.y < second.y + second.height + gap &&
    first.y + first.height + gap > second.y
  );
}

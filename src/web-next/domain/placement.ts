import type { BoxFrame, WorkspaceSnapshot } from './workspace';

interface ViewportSize {
  width: number;
  height: number;
}

const SIDE_PADDING = 32;
const TOP_RESERVED = 112;
const BOTTOM_RESERVED = 96;
const BOX_GAP = 24;
const SEARCH_STEP = 24;

export function findPageLandingFrame(
  snapshot: WorkspaceSnapshot,
  boxId: string,
  pageId: string,
  viewport: ViewportSize,
): BoxFrame | null {
  const movingBox = snapshot.boxes.find((box) => box.id === boxId);
  if (!movingBox) {
    return null;
  }

  const { width, height } = movingBox.frame;
  const minX = SIDE_PADDING;
  const minY = TOP_RESERVED;
  const maxX = Math.max(minX, viewport.width - width - SIDE_PADDING);
  const maxY = Math.max(minY, viewport.height - height - BOTTOM_RESERVED);
  const centerX = clamp(Math.round((viewport.width - width) / 2), minX, maxX);
  const centerY = clamp(Math.round((viewport.height - height) / 2), minY, maxY);
  const occupiedFrames = snapshot.boxes
    .filter((box) => box.pageId === pageId && box.id !== boxId)
    .map((box) => box.frame);

  const candidates = createCandidatePositions(minX, minY, maxX, maxY, centerX, centerY);
  const available = candidates.find(({ x, y }) => {
    const candidate = { x, y, width, height };
    return occupiedFrames.every((frame) => !framesOverlap(candidate, frame, BOX_GAP));
  });

  return {
    x: available?.x ?? centerX,
    y: available?.y ?? centerY,
    width,
    height,
  };
}

function createCandidatePositions(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  centerX: number,
  centerY: number,
) {
  const positions = [{ x: centerX, y: centerY }];

  for (let y = minY; y <= maxY; y += SEARCH_STEP) {
    for (let x = minX; x <= maxX; x += SEARCH_STEP) {
      positions.push({ x, y });
    }
  }

  return positions.sort((first, second) => {
    const firstDistance = (first.x - centerX) ** 2 + (first.y - centerY) ** 2;
    const secondDistance = (second.x - centerX) ** 2 + (second.y - centerY) ** 2;
    return firstDistance - secondDistance;
  });
}

function framesOverlap(first: BoxFrame, second: BoxFrame, gap: number) {
  return (
    first.x < second.x + second.width + gap &&
    first.x + first.width + gap > second.x &&
    first.y < second.y + second.height + gap &&
    first.y + first.height + gap > second.y
  );
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

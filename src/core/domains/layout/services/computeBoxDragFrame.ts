import { calculateSnap } from './calculateSnap';
import type { WorkspaceBox } from '../../workspace/model/workspace';

const MIN_BOX_GAP = 28;
const POSITION_GRID = 20;

function hasGapConflict(
  candidate: { x: number; y: number; width: number; height: number },
  other: { x: number; y: number; width: number; height: number },
) {
  return !(
    candidate.x + candidate.width + MIN_BOX_GAP <= other.x ||
    other.x + other.width + MIN_BOX_GAP <= candidate.x ||
    candidate.y + candidate.height + MIN_BOX_GAP <= other.y ||
    other.y + other.height + MIN_BOX_GAP <= candidate.y
  );
}

function resolveGapConstrainedPosition(
  x: number,
  y: number,
  width: number,
  height: number,
  allBoxes: WorkspaceBox[],
  currentId: string,
) {
  let nextX = Math.max(0, x);
  let nextY = Math.max(0, y);

  for (let pass = 0; pass < 4; pass += 1) {
    let moved = false;
    const candidate = { x: nextX, y: nextY, width, height };

    for (const other of allBoxes) {
      if (other.id === currentId || !hasGapConflict(candidate, other.bounds)) {
        continue;
      }

      const leftX = other.bounds.x - width - MIN_BOX_GAP;
      const rightX = other.bounds.x + other.bounds.width + MIN_BOX_GAP;
      const topY = other.bounds.y - height - MIN_BOX_GAP;
      const bottomY = other.bounds.y + other.bounds.height + MIN_BOX_GAP;
      const candidates = [
        { x: leftX, y: nextY, distance: Math.abs(nextX - leftX) },
        { x: rightX, y: nextY, distance: Math.abs(nextX - rightX) },
        { x: nextX, y: topY, distance: Math.abs(nextY - topY) },
        { x: nextX, y: bottomY, distance: Math.abs(nextY - bottomY) },
      ]
        .map((position) => ({
          ...position,
          x: Math.max(0, position.x),
          y: Math.max(0, position.y),
        }))
        .sort((first, second) => first.distance - second.distance);

      nextX = candidates[0].x;
      nextY = candidates[0].y;
      candidate.x = nextX;
      candidate.y = nextY;
      moved = true;
    }

    if (!moved) {
      break;
    }
  }

  const candidate = { x: nextX, y: nextY, width, height };

  if (
    !allBoxes.some((other) => other.id !== currentId && hasGapConflict(candidate, other.bounds))
  ) {
    return { x: nextX, y: nextY };
  }

  for (let radius = 1; radius <= 80; radius += 1) {
    const positions: Array<{ x: number; y: number; distance: number }> = [];

    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) {
          continue;
        }

        const candidateX = Math.max(0, nextX + dx * POSITION_GRID);
        const candidateY = Math.max(0, nextY + dy * POSITION_GRID);
        positions.push({
          x: candidateX,
          y: candidateY,
          distance: (candidateX - x) ** 2 + (candidateY - y) ** 2,
        });
      }
    }

    positions.sort((first, second) => first.distance - second.distance);

    for (const position of positions) {
      const resolvedCandidate = { ...position, width, height };

      if (
        !allBoxes.some(
          (other) => other.id !== currentId && hasGapConflict(resolvedCandidate, other.bounds),
        )
      ) {
        return { x: position.x, y: position.y };
      }
    }
  }

  return {
    x: 0,
    y: Math.max(0, ...allBoxes.map((other) => other.bounds.y + other.bounds.height + MIN_BOX_GAP)),
  };
}

export function computeBoxDragFrame(
  moveEvent: { clientX: number; clientY: number },
  dragStart: { clientX: number; clientY: number; initialBoxX: number; initialBoxY: number },
  box: Pick<WorkspaceBox, 'id' | 'bounds'>,
  allBoxes: WorkspaceBox[],
) {
  const offsetX = moveEvent.clientX - dragStart.clientX;
  const offsetY = moveEvent.clientY - dragStart.clientY;
  const newX = Math.max(0, dragStart.initialBoxX + offsetX);
  const newY = Math.max(0, dragStart.initialBoxY + offsetY);
  const snap = calculateSnap(newX, newY, box.bounds.width, box.bounds.height, allBoxes, box.id);
  const constrained = resolveGapConstrainedPosition(
    snap.x,
    snap.y,
    box.bounds.width,
    box.bounds.height,
    allBoxes,
    box.id,
  );

  return {
    newX,
    newY,
    snap: {
      ...snap,
      x: constrained.x,
      y: constrained.y,
    },
  };
}

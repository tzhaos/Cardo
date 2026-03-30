import type { BoxData } from '../../../types/box';
import type { SnapGuide } from '../model/snap';

export function calculateSnap(
  newX: number,
  newY: number,
  width: number,
  height: number,
  allBoxes: BoxData[],
  currentId: string,
) {
  const snapThreshold = 10;
  const gridSize = 20;

  let snappedX = newX;
  let snappedY = newY;
  let snappedXFlag = false;
  let snappedYFlag = false;

  const guides: SnapGuide[] = [];

  for (const other of allBoxes) {
    if (other.id === currentId || other.isMinimized) {
      continue;
    }

    if (!snappedXFlag && Math.abs(newX - other.x) < snapThreshold) {
      snappedX = other.x;
      snappedXFlag = true;
      guides.push({ type: 'vertical', pos: other.x });
    }

    if (!snappedYFlag && Math.abs(newY - other.y) < snapThreshold) {
      snappedY = other.y;
      snappedYFlag = true;
      guides.push({ type: 'horizontal', pos: other.y });
    }
  }

  if (!snappedXFlag && Math.abs(newX) < snapThreshold) {
    snappedX = 0;
    snappedXFlag = true;
    guides.push({ type: 'vertical', pos: 0 });
  }

  if (!snappedYFlag && Math.abs(newY) < snapThreshold) {
    snappedY = 0;
    snappedYFlag = true;
    guides.push({ type: 'horizontal', pos: 0 });
  }

  if (!snappedXFlag) {
    snappedX = Math.round(newX / gridSize) * gridSize;
  }

  if (!snappedYFlag) {
    snappedY = Math.round(newY / gridSize) * gridSize;
  }

  return {
    x: snappedX,
    y: snappedY,
    width,
    height,
    isSnapped: snappedXFlag || snappedYFlag,
    guides,
  };
}

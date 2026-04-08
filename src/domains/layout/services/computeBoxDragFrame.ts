import { calculateSnap } from './calculateSnap';
import type { WorkspaceBox } from '../../workspace/model/workspace';

export function computeBoxDragFrame(
  moveEvent: { clientX: number; clientY: number },
  dragStart: { clientX: number; clientY: number; initialBoxX: number; initialBoxY: number },
  box: Pick<WorkspaceBox, 'id' | 'bounds'>,
  allBoxes: WorkspaceBox[],
) {
  const offsetX = moveEvent.clientX - dragStart.clientX;
  const offsetY = moveEvent.clientY - dragStart.clientY;
  const newX = dragStart.initialBoxX + offsetX;
  const newY = dragStart.initialBoxY + offsetY;
  const snap = calculateSnap(newX, newY, box.bounds.width, box.bounds.height, allBoxes, box.id);

  return { newX, newY, snap };
}

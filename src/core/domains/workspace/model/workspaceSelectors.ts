import type { BoxItemPlacement, WorkspaceBox, WorkspaceSnapshotV5 } from './workspace';
import { mergeWorkspaceBox } from './createInitialWorkspaceSnapshot';
import type { PlacedWorkspaceItem } from '../../items/model/item';

export function getOrderedBoxes(
  snapshot: Pick<WorkspaceSnapshotV5, 'boxesById' | 'boxOrder' | 'boxViewStatesById'>,
) {
  return snapshot.boxOrder
    .map((boxId) => {
      const box = snapshot.boxesById[boxId];
      const viewState = snapshot.boxViewStatesById[boxId];
      return box && viewState ? mergeWorkspaceBox(box, viewState) : null;
    })
    .filter((box): box is WorkspaceBox => Boolean(box));
}

export function getVisibleBoxes(
  snapshot: Pick<WorkspaceSnapshotV5, 'boxesById' | 'boxOrder' | 'boxViewStatesById'>,
) {
  return getOrderedBoxes(snapshot);
}

export function getVisibleBoxIds(
  snapshot: Pick<WorkspaceSnapshotV5, 'boxesById' | 'boxOrder' | 'boxViewStatesById'>,
) {
  return getVisibleBoxes(snapshot).map((box) => box.id);
}

export function getWorkspaceBox(
  snapshot: Pick<WorkspaceSnapshotV5, 'boxesById' | 'boxViewStatesById'>,
  boxId: string,
) {
  const box = snapshot.boxesById[boxId];
  const viewState = snapshot.boxViewStatesById[boxId];
  return box && viewState ? mergeWorkspaceBox(box, viewState) : null;
}

export function getBoxPlacements(
  snapshot: Pick<WorkspaceSnapshotV5, 'itemPlacementsByBoxId'>,
  boxId: string,
): BoxItemPlacement[] {
  return snapshot.itemPlacementsByBoxId[boxId] ?? [];
}

export function getBoxItems(
  snapshot: Pick<WorkspaceSnapshotV5, 'itemsById' | 'itemPlacementsByBoxId'>,
  boxId: string,
): PlacedWorkspaceItem[] {
  return getBoxPlacements(snapshot, boxId)
    .map((placement) => {
      const item = snapshot.itemsById[placement.itemId];
      return item
        ? {
            ...item,
            boxId,
            isPinned: placement.isPinned,
            ...(placement.columnId ? { columnId: placement.columnId } : {}),
          }
        : null;
    })
    .filter((item): item is PlacedWorkspaceItem => Boolean(item));
}

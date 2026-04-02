import type { WorkspaceBox, WorkspaceBoxRole, WorkspaceSnapshotV3 } from './workspace';

export function getOrderedBoxes(snapshot: Pick<WorkspaceSnapshotV3, 'boxesById' | 'boxOrder'>) {
  return snapshot.boxOrder
    .map((boxId) => snapshot.boxesById[boxId])
    .filter((box): box is WorkspaceBox => Boolean(box));
}

export function getVisibleBoxes(snapshot: Pick<WorkspaceSnapshotV3, 'boxesById' | 'boxOrder'>) {
  return getOrderedBoxes(snapshot).filter((box) => !box.isMinimized);
}

export function getVisibleBoxIds(snapshot: Pick<WorkspaceSnapshotV3, 'boxesById' | 'boxOrder'>) {
  return getVisibleBoxes(snapshot).map((box) => box.id);
}

export function getWorkspaceBox(
  snapshot: Pick<WorkspaceSnapshotV3, 'boxesById'>,
  boxId: string,
) {
  return snapshot.boxesById[boxId] ?? null;
}

export function findBoxByRole(
  snapshot: Pick<WorkspaceSnapshotV3, 'boxesById' | 'boxOrder'>,
  role: WorkspaceBoxRole,
) {
  return getOrderedBoxes(snapshot).find((box) => box.role === role) ?? null;
}

export function areAllBoxesMinimized(snapshot: Pick<WorkspaceSnapshotV3, 'boxesById' | 'boxOrder'>) {
  return getOrderedBoxes(snapshot).every((box) => box.isMinimized);
}

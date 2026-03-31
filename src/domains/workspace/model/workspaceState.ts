import type { BoxData, SystemBoxRole } from '../../../types/box';
import { getMaxZIndex } from './defaultBoxes';
import { inferSystemBoxRole } from './workspaceRoles';

export const WORKSPACE_STATE_VERSION = 2;

export interface WorkspaceDataState {
  version: number;
  boxesById: Record<string, BoxData>;
  boxOrder: string[];
  maxZIndex: number;
}

export interface WorkspaceExportPayload {
  version: number;
  boxes: BoxData[];
}

export function getOrderedBoxes(state: Pick<WorkspaceDataState, 'boxesById' | 'boxOrder'>) {
  return state.boxOrder
    .map((boxId) => state.boxesById[boxId])
    .filter((box): box is BoxData => Boolean(box));
}

export function getVisibleBoxIds(state: Pick<WorkspaceDataState, 'boxesById' | 'boxOrder'>) {
  return state.boxOrder.filter((boxId) => {
    const box = state.boxesById[boxId];
    return Boolean(box && !box.isMinimized);
  });
}

export function getBoxById(
  state: Pick<WorkspaceDataState, 'boxesById'>,
  boxId: string,
) {
  return state.boxesById[boxId] ?? null;
}

export function findBoxByRole(
  state: Pick<WorkspaceDataState, 'boxesById' | 'boxOrder'>,
  role: SystemBoxRole,
) {
  for (const boxId of state.boxOrder) {
    const box = state.boxesById[boxId];

    if (box && inferSystemBoxRole(box) === role) {
      return box;
    }
  }

  return null;
}

export function createWorkspaceDataState(
  boxes: BoxData[],
  version = WORKSPACE_STATE_VERSION,
): WorkspaceDataState {
  const boxesById: Record<string, BoxData> = {};
  const boxOrder: string[] = [];

  for (const box of boxes) {
    boxesById[box.id] = box;

    if (!boxOrder.includes(box.id)) {
      boxOrder.push(box.id);
    }
  }

  return {
    version,
    boxesById,
    boxOrder,
    maxZIndex: getMaxZIndex(boxes),
  };
}

export function createWorkspaceExportPayload(
  state: Pick<WorkspaceDataState, 'boxesById' | 'boxOrder'>,
): WorkspaceExportPayload {
  return {
    version: WORKSPACE_STATE_VERSION,
    boxes: getOrderedBoxes(state),
  };
}

import {
  WORKSPACE_SCHEMA_VERSION,
  type BoxDesktopViewState,
  type BoxItemPlacement,
  type WorkspaceBox,
  type WorkspaceBoxEntity,
  type WorkspaceSnapshotV5,
} from './workspace';

function splitBox(box: WorkspaceBox): {
  entity: WorkspaceBoxEntity;
  viewState: BoxDesktopViewState;
  placements: BoxItemPlacement[];
} {
  return {
    entity: {
      id: box.id,
      customTitle: box.customTitle,
    },
    viewState: {
      boxId: box.id,
      bounds: box.bounds,
      isLocked: box.isLocked,
      isCollapsed: box.isCollapsed,
      isMinimized: box.isMinimized,
      layout: box.layout,
      zIndex: box.zIndex,
    },
    placements: [],
  };
}

export function createWorkspaceSnapshot(boxes: WorkspaceBox[]): WorkspaceSnapshotV5 {
  const boxesById: Record<string, WorkspaceBoxEntity> = {};
  const boxViewStatesById: Record<string, BoxDesktopViewState> = {};
  const itemPlacementsByBoxId: Record<string, BoxItemPlacement[]> = {};
  const boxOrder: string[] = [];
  let maxZIndex = 0;

  for (const box of boxes) {
    const { entity, viewState, placements } = splitBox(box);
    boxesById[box.id] = entity;
    boxViewStatesById[box.id] = viewState;
    itemPlacementsByBoxId[box.id] = placements;

    if (!boxOrder.includes(box.id)) {
      boxOrder.push(box.id);
    }

    maxZIndex = Math.max(maxZIndex, box.zIndex);
  }

  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    boxesById,
    boxOrder,
    boxViewStatesById,
    itemsById: {},
    itemPlacementsByBoxId,
    maxZIndex,
  };
}

export function createInitialWorkspaceSnapshot(): WorkspaceSnapshotV5 {
  return createWorkspaceSnapshot([
    {
      id: 'default-box',
      customTitle: null,
      bounds: { x: 100, y: 100, width: 320, height: 400 },
      isLocked: false,
      isCollapsed: false,
      isMinimized: false,
      layout: 'grid',
      zIndex: 1,
    },
  ]);
}

export function mergeWorkspaceBox(
  entity: WorkspaceBoxEntity,
  viewState: BoxDesktopViewState,
): WorkspaceBox {
  return {
    ...entity,
    bounds: viewState.bounds,
    isLocked: viewState.isLocked,
    isCollapsed: viewState.isCollapsed,
    isMinimized: viewState.isMinimized,
    layout: viewState.layout,
    zIndex: viewState.zIndex,
  };
}

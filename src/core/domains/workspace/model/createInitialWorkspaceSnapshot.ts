import {
  WORKSPACE_SCHEMA_VERSION,
  type BoxDesktopViewState,
  type BoxItemPlacement,
  type WorkspaceBox,
  type WorkspaceBoxEntity,
  type WorkspaceSnapshotV5,
} from './workspace';

function createSystemBox(
  id: string,
  role: NonNullable<WorkspaceBox['role']>,
  x: number,
  y: number,
  zIndex: number,
  layout: WorkspaceBox['layout'],
): WorkspaceBox {
  return {
    id,
    role,
    customTitle: null,
    bounds: {
      x,
      y,
      width: 320,
      height: 400,
    },
    isLocked: false,
    isCollapsed: false,
    isMinimized: false,
    layout,
    zIndex,
  };
}

function splitBox(box: WorkspaceBox): {
  entity: WorkspaceBoxEntity;
  viewState: BoxDesktopViewState;
  placements: BoxItemPlacement[];
} {
  return {
    entity: {
      id: box.id,
      role: box.role,
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
    createSystemBox('system-folders', 'folders', 100, 100, 10, 'grid'),
    createSystemBox('system-links', 'links', 450, 100, 11, 'list'),
    createSystemBox('system-notes', 'notes', 800, 100, 12, 'list'),
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

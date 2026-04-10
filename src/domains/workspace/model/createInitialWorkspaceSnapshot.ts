import { WORKSPACE_SCHEMA_VERSION, type WorkspaceBox, type WorkspaceSnapshotV4 } from './workspace';

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
    items: [],
  };
}

export function createWorkspaceSnapshot(boxes: WorkspaceBox[]): WorkspaceSnapshotV4 {
  const boxesById: Record<string, WorkspaceBox> = {};
  const boxOrder: string[] = [];
  let maxZIndex = 0;

  for (const box of boxes) {
    boxesById[box.id] = box;

    if (!boxOrder.includes(box.id)) {
      boxOrder.push(box.id);
    }

    maxZIndex = Math.max(maxZIndex, box.zIndex);
  }

  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    boxesById,
    boxOrder,
    maxZIndex,
  };
}

export function createInitialWorkspaceSnapshot(): WorkspaceSnapshotV4 {
  return createWorkspaceSnapshot([
    createSystemBox('system-folders', 'folders', 100, 100, 10, 'grid'),
    createSystemBox('system-links', 'links', 450, 100, 11, 'list'),
    createSystemBox('system-notes', 'notes', 800, 100, 12, 'list'),
  ]);
}

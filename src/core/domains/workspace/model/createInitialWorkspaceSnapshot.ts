import {
  DEFAULT_BOX_TEMPLATE_ID,
  WORKSPACE_SCHEMA_VERSION,
  type BoxDesktopViewState,
  type BoxItemPlacement,
  type WorkspaceBox,
  type WorkspaceBoxEntity,
  type WorkspaceSnapshotV6,
} from './workspace';
import { createDefaultTemplateState, getBoxTemplateDefinition } from './boxTemplates';

function splitBox(box: WorkspaceBox): {
  entity: WorkspaceBoxEntity;
  viewState: BoxDesktopViewState;
  placements: BoxItemPlacement[];
} {
  return {
    entity: {
      id: box.id,
      customTitle: box.customTitle,
      templateId: box.templateId,
      templateState: box.templateState,
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

export function createWorkspaceSnapshot(boxes: WorkspaceBox[]): WorkspaceSnapshotV6 {
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

export function createInitialWorkspaceSnapshot(): WorkspaceSnapshotV6 {
  const inboxTemplate = getBoxTemplateDefinition('inbox');
  const kanbanTemplate = getBoxTemplateDefinition('kanban');
  const launcherTemplate = getBoxTemplateDefinition('launcher');

  return createWorkspaceSnapshot([
    {
      id: 'default-inbox',
      customTitle: null,
      templateId: 'inbox',
      templateState: createDefaultTemplateState('inbox'),
      bounds: { x: 80, y: 96, ...inboxTemplate.defaultBounds },
      isLocked: false,
      isCollapsed: false,
      isMinimized: false,
      layout: inboxTemplate.defaultLayout,
      zIndex: 1,
    },
    {
      id: 'default-kanban',
      customTitle: null,
      templateId: 'kanban',
      templateState: createDefaultTemplateState('kanban'),
      bounds: { x: 460, y: 96, ...kanbanTemplate.defaultBounds },
      isLocked: false,
      isCollapsed: false,
      isMinimized: false,
      layout: kanbanTemplate.defaultLayout,
      zIndex: 2,
    },
    {
      id: 'default-launcher',
      customTitle: null,
      templateId: 'launcher',
      templateState: createDefaultTemplateState('launcher'),
      bounds: { x: 80, y: 560, ...launcherTemplate.defaultBounds },
      isLocked: false,
      isCollapsed: false,
      isMinimized: false,
      layout: launcherTemplate.defaultLayout,
      zIndex: 3,
    },
  ]);
}

export function mergeWorkspaceBox(
  entity: WorkspaceBoxEntity,
  viewState: BoxDesktopViewState,
): WorkspaceBox {
  return {
    ...entity,
    templateState:
      entity.templateState ??
      createDefaultTemplateState(entity.templateId ?? DEFAULT_BOX_TEMPLATE_ID),
    bounds: viewState.bounds,
    isLocked: viewState.isLocked,
    isCollapsed: viewState.isCollapsed,
    isMinimized: viewState.isMinimized,
    layout: viewState.layout,
    zIndex: viewState.zIndex,
  };
}

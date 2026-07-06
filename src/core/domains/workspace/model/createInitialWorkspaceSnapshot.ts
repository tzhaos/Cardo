import {
  DEFAULT_BOX_TEMPLATE_ID,
  type BoxTemplateId,
  WORKSPACE_SCHEMA_VERSION,
  type BoxDesktopViewState,
  type BoxItemPlacement,
  type WorkspaceBox,
  type WorkspaceBoxEntity,
  type WorkspaceSnapshotV7,
} from './workspace';
import { createDefaultTemplateState, getBoxTemplateDefinition } from './boxTemplates';

interface InitialWorkspaceBoxConfig {
  id: string;
  templateId: BoxTemplateId;
  title?: string;
  columnIndex: number;
  orderIndex: number;
  width: number;
  height: number;
}

const INITIAL_WORKSPACE_BOXES: InitialWorkspaceBoxConfig[] = [
  {
    id: 'default-kanban',
    templateId: 'kanban',
    title: 'Priority flow',
    columnIndex: 0,
    orderIndex: 0,
    width: 340,
    height: 280,
  },
  {
    id: 'default-kanban-sprint',
    templateId: 'kanban',
    title: 'Sprint lane',
    columnIndex: 1,
    orderIndex: 0,
    width: 340,
    height: 280,
  },
  {
    id: 'default-kanban-review',
    templateId: 'kanban',
    title: 'Review queue',
    columnIndex: 2,
    orderIndex: 0,
    width: 340,
    height: 280,
  },
  {
    id: 'default-kanban-done',
    templateId: 'kanban',
    title: 'Done archive',
    columnIndex: 3,
    orderIndex: 0,
    width: 320,
    height: 280,
  },
  {
    id: 'default-collection-folders',
    templateId: 'collection',
    title: 'Folders',
    columnIndex: 0,
    orderIndex: 0,
    width: 360,
    height: 520,
  },
  {
    id: 'default-collection-projects',
    templateId: 'collection',
    title: 'Project files',
    columnIndex: 1,
    orderIndex: 0,
    width: 320,
    height: 420,
  },
  {
    id: 'default-launcher',
    templateId: 'launcher',
    title: 'Daily launch',
    columnIndex: 0,
    orderIndex: 0,
    width: 260,
    height: 260,
  },
  {
    id: 'default-launcher-tools',
    templateId: 'launcher',
    title: 'Tool belt',
    columnIndex: 1,
    orderIndex: 0,
    width: 340,
    height: 220,
  },
  {
    id: 'default-inbox',
    templateId: 'inbox',
    title: 'Capture inbox',
    columnIndex: 0,
    orderIndex: 0,
    width: 340,
    height: 440,
  },
  {
    id: 'default-inbox-triage',
    templateId: 'inbox',
    title: 'Triage queue',
    columnIndex: 1,
    orderIndex: 0,
    width: 300,
    height: 360,
  },
  {
    id: 'default-project-board-roadmap',
    templateId: 'project-board',
    title: 'Roadmap',
    columnIndex: 0,
    orderIndex: 0,
    width: 520,
    height: 500,
  },
  {
    id: 'default-project-board-decisions',
    templateId: 'project-board',
    title: 'Decisions',
    columnIndex: 1,
    orderIndex: 0,
    width: 460,
    height: 420,
  },
  {
    id: 'default-daily-desk-today',
    templateId: 'daily-desk',
    title: 'Today',
    columnIndex: 0,
    orderIndex: 0,
    width: 420,
    height: 460,
  },
  {
    id: 'default-daily-desk-followup',
    templateId: 'daily-desk',
    title: 'Follow up',
    columnIndex: 1,
    orderIndex: 0,
    width: 340,
    height: 360,
  },
  {
    id: 'default-web-library-research',
    templateId: 'web-library',
    title: 'Research links',
    columnIndex: 0,
    orderIndex: 0,
    width: 420,
    height: 520,
  },
  {
    id: 'default-web-library-saved',
    templateId: 'web-library',
    title: 'Saved sites',
    columnIndex: 1,
    orderIndex: 0,
    width: 360,
    height: 380,
  },
  {
    id: 'default-frequent-sites-core',
    templateId: 'frequent-sites',
    title: 'Core sites',
    columnIndex: 0,
    orderIndex: 0,
    width: 300,
    height: 300,
  },
  {
    id: 'default-frequent-sites-secondary',
    templateId: 'frequent-sites',
    title: 'Secondary',
    columnIndex: 1,
    orderIndex: 0,
    width: 340,
    height: 260,
  },
  {
    id: 'default-reading-list-now',
    templateId: 'reading-list',
    title: 'Read next',
    columnIndex: 0,
    orderIndex: 0,
    width: 360,
    height: 520,
  },
  {
    id: 'default-reading-list-later',
    templateId: 'reading-list',
    title: 'Read later',
    columnIndex: 1,
    orderIndex: 0,
    width: 320,
    height: 420,
  },
];

const DEFAULT_BOX_COUNT_BY_TEMPLATE = INITIAL_WORKSPACE_BOXES.reduce(
  (counts, box) => ({
    ...counts,
    [box.templateId]: (counts[box.templateId] ?? 0) + 1,
  }),
  {} as Partial<Record<BoxTemplateId, number>>,
);

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

function createInitialBox(config: InitialWorkspaceBoxConfig, zIndex: number): WorkspaceBox {
  const template = getBoxTemplateDefinition(config.templateId);

  return {
    id: config.id,
    customTitle: config.title ?? null,
    templateId: config.templateId,
    templateState: createDefaultTemplateState(config.templateId),
    bounds: {
      x: config.columnIndex,
      y: config.orderIndex,
      width: config.width,
      height: config.height,
    },
    isLocked: false,
    isCollapsed: false,
    isMinimized: false,
    layout: template.defaultLayout,
    zIndex,
  };
}

export function createWorkspaceSnapshot(boxes: WorkspaceBox[]): WorkspaceSnapshotV7 {
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
    bookmarksById: {},
    bookmarkFoldersById: {},
    bookmarkFolderOrder: [],
    maxZIndex,
  };
}

export function createInitialWorkspaceSnapshot(): WorkspaceSnapshotV7 {
  return createWorkspaceSnapshot(
    INITIAL_WORKSPACE_BOXES.map((box, index) => createInitialBox(box, index + 1)),
  );
}

export function ensureDefaultWorkspacePageBoxes(
  snapshot: WorkspaceSnapshotV7,
): WorkspaceSnapshotV7 {
  const existingCounts = snapshot.boxOrder.reduce(
    (counts, boxId) => {
      const box = snapshot.boxesById[boxId];

      if (!box) {
        return counts;
      }

      return {
        ...counts,
        [box.templateId]: (counts[box.templateId] ?? 0) + 1,
      };
    },
    {} as Partial<Record<BoxTemplateId, number>>,
  );
  let nextSnapshot = snapshot;
  let maxZIndex = snapshot.maxZIndex;
  let hasAddedBoxes = false;

  for (const config of INITIAL_WORKSPACE_BOXES) {
    const targetCount = DEFAULT_BOX_COUNT_BY_TEMPLATE[config.templateId] ?? 0;
    const existingCount = existingCounts[config.templateId] ?? 0;

    if (existingCount >= targetCount || nextSnapshot.boxesById[config.id]) {
      continue;
    }

    maxZIndex += 1;
    const box = createInitialBox(config, maxZIndex);
    const { entity, viewState, placements } = splitBox(box);
    nextSnapshot = {
      ...nextSnapshot,
      boxesById: {
        ...nextSnapshot.boxesById,
        [box.id]: entity,
      },
      boxOrder: [...nextSnapshot.boxOrder, box.id],
      boxViewStatesById: {
        ...nextSnapshot.boxViewStatesById,
        [box.id]: viewState,
      },
      itemPlacementsByBoxId: {
        ...nextSnapshot.itemPlacementsByBoxId,
        [box.id]: placements,
      },
      maxZIndex,
    };
    existingCounts[config.templateId] = existingCount + 1;
    hasAddedBoxes = true;
  }

  return hasAddedBoxes ? nextSnapshot : snapshot;
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

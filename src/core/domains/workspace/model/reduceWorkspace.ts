import { updateWorkspaceItem, type WorkspaceItem } from '../../items/model/item';
import {
  createDefaultTemplateState,
  createWorkspaceSnapshot,
} from './createInitialWorkspaceSnapshot';
import type {
  BoxDesktopViewState,
  BoxItemPlacement,
  KanbanColumn,
  WorkspaceBoxTemplateState,
  WorkspaceBox,
  WorkspaceBoxEntity,
  WorkspaceBoxWithItems,
  WorkspaceCommand,
  WorkspaceSnapshot,
  WorkspaceSnapshotV6,
} from './workspace';
import { MAX_KANBAN_COLUMNS } from './workspace';

function splitBox(box: WorkspaceBox): {
  entity: WorkspaceBoxEntity;
  viewState: BoxDesktopViewState;
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
  };
}

function stripPlacedItem(item: WorkspaceBoxWithItems['items'][number]): WorkspaceItem {
  const { boxId: _boxId, isPinned: _isPinned, columnId: _columnId, ...workspaceItem } = item;
  return workspaceItem;
}

function createSnapshotFromBoxesWithItems(boxes: WorkspaceBoxWithItems[]): WorkspaceSnapshotV6 {
  const snapshot = createWorkspaceSnapshot(boxes);
  const itemsById: Record<string, WorkspaceItem> = {};
  const itemPlacementsByBoxId: Record<string, BoxItemPlacement[]> = {
    ...snapshot.itemPlacementsByBoxId,
  };

  for (const box of boxes) {
    itemPlacementsByBoxId[box.id] = box.items.map((item) => {
      itemsById[item.id] = stripPlacedItem(item);
      return {
        itemId: item.id,
        isPinned: item.isPinned,
        ...(item.columnId ? { columnId: item.columnId } : {}),
      };
    });
  }

  return {
    ...snapshot,
    itemsById,
    itemPlacementsByBoxId,
  };
}

function pruneUnplacedItems(snapshot: WorkspaceSnapshotV6): WorkspaceSnapshotV6 {
  const placedItemIds = new Set(
    Object.values(snapshot.itemPlacementsByBoxId).flatMap((placements) =>
      placements.map((placement) => placement.itemId),
    ),
  );
  const itemsById = Object.fromEntries(
    Object.entries(snapshot.itemsById).filter(([itemId]) => placedItemIds.has(itemId)),
  );

  return {
    ...snapshot,
    itemsById,
  };
}

function updateBoxViewState(
  snapshot: WorkspaceSnapshotV6,
  boxId: string,
  updater: (viewState: BoxDesktopViewState) => BoxDesktopViewState,
): WorkspaceSnapshotV6 {
  const viewState = snapshot.boxViewStatesById[boxId];

  if (!viewState) {
    return snapshot;
  }

  return {
    ...snapshot,
    boxViewStatesById: {
      ...snapshot.boxViewStatesById,
      [boxId]: updater(viewState),
    },
  };
}

function getKanbanColumns(entity: WorkspaceBoxEntity): KanbanColumn[] {
  if (entity.templateId !== 'kanban') {
    return [];
  }

  const columns = entity.templateState.kanbanColumns;
  return columns && columns.length > 0
    ? columns.map((column) => ({ ...column }))
    : (createDefaultTemplateState('kanban').kanbanColumns ?? []);
}

function updateBoxTemplateState(
  snapshot: WorkspaceSnapshotV6,
  boxId: string,
  templateState: WorkspaceBoxTemplateState,
): WorkspaceSnapshotV6 {
  const entity = snapshot.boxesById[boxId];

  if (!entity) {
    return snapshot;
  }

  return {
    ...snapshot,
    boxesById: {
      ...snapshot.boxesById,
      [boxId]: {
        ...entity,
        templateState,
      },
    },
  };
}

function updateKanbanColumns(
  snapshot: WorkspaceSnapshotV6,
  boxId: string,
  updater: (columns: KanbanColumn[]) => KanbanColumn[] | null,
): WorkspaceSnapshotV6 {
  const entity = snapshot.boxesById[boxId];

  if (!entity || entity.templateId !== 'kanban') {
    return snapshot;
  }

  const nextColumns = updater(getKanbanColumns(entity));

  if (!nextColumns) {
    return snapshot;
  }

  return updateBoxTemplateState(snapshot, boxId, {
    ...entity.templateState,
    kanbanColumns: nextColumns,
  });
}

function deleteKanbanColumn(
  snapshot: WorkspaceSnapshotV6,
  boxId: string,
  columnId: string,
  fallbackColumnId?: string,
): WorkspaceSnapshotV6 {
  const entity = snapshot.boxesById[boxId];

  if (!entity || entity.templateId !== 'kanban') {
    return snapshot;
  }

  const columns = getKanbanColumns(entity);

  if (columns.length <= 1 || !columns.some((column) => column.id === columnId)) {
    return snapshot;
  }

  const nextColumns = columns.filter((column) => column.id !== columnId);
  const fallbackColumn =
    nextColumns.find((column) => column.id === fallbackColumnId) ?? nextColumns[0] ?? null;

  const itemPlacementsByBoxId = {
    ...snapshot.itemPlacementsByBoxId,
    [boxId]: (snapshot.itemPlacementsByBoxId[boxId] ?? []).map((placement) =>
      placement.columnId === columnId && fallbackColumn
        ? { ...placement, columnId: fallbackColumn.id }
        : placement,
    ),
  };

  return updateBoxTemplateState(
    {
      ...snapshot,
      itemPlacementsByBoxId,
    },
    boxId,
    {
      ...entity.templateState,
      kanbanColumns: nextColumns,
    },
  );
}

function moveWorkspaceItem(
  snapshot: WorkspaceSnapshotV6,
  itemId: string,
  sourceBoxId: string,
  targetBoxId: string,
  targetIndex?: number,
  targetColumnId?: string,
): WorkspaceSnapshotV6 {
  if (!snapshot.boxesById[sourceBoxId] || !snapshot.boxesById[targetBoxId]) {
    return snapshot;
  }

  const sourcePlacements = [...(snapshot.itemPlacementsByBoxId[sourceBoxId] ?? [])];
  const itemIndex = sourcePlacements.findIndex((placement) => placement.itemId === itemId);

  if (itemIndex === -1) {
    return snapshot;
  }

  const [removedPlacement] = sourcePlacements.splice(itemIndex, 1);
  const itemPlacementsByBoxId = { ...snapshot.itemPlacementsByBoxId };

  if (sourceBoxId === targetBoxId) {
    const adjustedIndex =
      targetIndex === undefined
        ? sourcePlacements.length
        : targetIndex > itemIndex
          ? targetIndex - 1
          : targetIndex;
    const referencePlacement =
      sourcePlacements[adjustedIndex] ?? sourcePlacements[adjustedIndex - 1] ?? null;
    const movedPlacement = {
      itemId,
      isPinned:
        targetIndex === undefined
          ? false
          : (referencePlacement?.isPinned ?? removedPlacement.isPinned),
      ...(targetColumnId || removedPlacement.columnId
        ? { columnId: targetColumnId ?? removedPlacement.columnId }
        : {}),
    };

    sourcePlacements.splice(adjustedIndex, 0, movedPlacement);
    itemPlacementsByBoxId[sourceBoxId] = sourcePlacements;

    return {
      ...snapshot,
      itemPlacementsByBoxId,
    };
  }

  const targetPlacements = [...(snapshot.itemPlacementsByBoxId[targetBoxId] ?? [])];
  const referencePlacement =
    targetIndex === undefined
      ? null
      : (targetPlacements[targetIndex] ?? targetPlacements[targetIndex - 1] ?? null);
  const movedPlacement = {
    itemId,
    isPinned:
      targetIndex === undefined
        ? false
        : (referencePlacement?.isPinned ?? removedPlacement.isPinned),
    ...(targetColumnId || removedPlacement.columnId
      ? { columnId: targetColumnId ?? removedPlacement.columnId }
      : {}),
  };

  if (targetIndex === undefined) {
    targetPlacements.push(movedPlacement);
  } else {
    targetPlacements.splice(targetIndex, 0, movedPlacement);
  }

  itemPlacementsByBoxId[sourceBoxId] = sourcePlacements;
  itemPlacementsByBoxId[targetBoxId] = targetPlacements;

  return {
    ...snapshot,
    itemPlacementsByBoxId,
  };
}

export function reduceWorkspace(
  snapshot: WorkspaceSnapshot,
  command: WorkspaceCommand,
): WorkspaceSnapshot {
  switch (command.type) {
    case 'workspace.replace':
      return command.snapshot;
    case 'workspace.replaceBoxes':
      return createSnapshotFromBoxesWithItems(command.boxes);
    case 'box.create': {
      if (snapshot.boxesById[command.box.id]) {
        return snapshot;
      }

      const { entity, viewState } = splitBox(command.box);

      return {
        ...snapshot,
        boxesById: {
          ...snapshot.boxesById,
          [command.box.id]: entity,
        },
        boxOrder: [...snapshot.boxOrder, command.box.id],
        boxViewStatesById: {
          ...snapshot.boxViewStatesById,
          [command.box.id]: viewState,
        },
        itemPlacementsByBoxId: {
          ...snapshot.itemPlacementsByBoxId,
          [command.box.id]: command.placements ?? [],
        },
        maxZIndex: Math.max(snapshot.maxZIndex, command.box.zIndex),
      };
    }
    case 'box.update': {
      if (!snapshot.boxesById[command.boxId] || !snapshot.boxViewStatesById[command.boxId]) {
        return snapshot;
      }

      const entity = snapshot.boxesById[command.boxId];
      const viewState = snapshot.boxViewStatesById[command.boxId];

      return {
        ...snapshot,
        boxesById: {
          ...snapshot.boxesById,
          [command.boxId]: {
            ...entity,
            customTitle:
              command.updates.customTitle === undefined
                ? entity.customTitle
                : command.updates.customTitle,
            templateId: command.updates.templateId ?? entity.templateId,
            templateState:
              command.updates.templateState ??
              (command.updates.templateId && command.updates.templateId !== entity.templateId
                ? createDefaultTemplateState(command.updates.templateId)
                : entity.templateState),
          },
        },
        boxViewStatesById: {
          ...snapshot.boxViewStatesById,
          [command.boxId]: {
            ...viewState,
            bounds: command.updates.bounds
              ? { ...viewState.bounds, ...command.updates.bounds }
              : viewState.bounds,
            isLocked: command.updates.isLocked ?? viewState.isLocked,
            isCollapsed: command.updates.isCollapsed ?? viewState.isCollapsed,
            isMinimized: command.updates.isMinimized ?? viewState.isMinimized,
            layout: command.updates.layout ?? viewState.layout,
            zIndex: command.updates.zIndex ?? viewState.zIndex,
          },
        },
      };
    }
    case 'box.delete': {
      if (!snapshot.boxesById[command.boxId]) {
        return snapshot;
      }

      const boxesById = { ...snapshot.boxesById };
      const boxViewStatesById = { ...snapshot.boxViewStatesById };
      const itemPlacementsByBoxId = { ...snapshot.itemPlacementsByBoxId };
      delete boxesById[command.boxId];
      delete boxViewStatesById[command.boxId];
      delete itemPlacementsByBoxId[command.boxId];

      return pruneUnplacedItems({
        ...snapshot,
        boxesById,
        boxViewStatesById,
        itemPlacementsByBoxId,
        boxOrder: snapshot.boxOrder.filter((boxId) => boxId !== command.boxId),
      });
    }
    case 'box.bringToFront': {
      const nextZIndex = snapshot.maxZIndex + 1;
      const withUpdatedBox = updateBoxViewState(snapshot, command.boxId, (viewState) => ({
        ...viewState,
        zIndex: nextZIndex,
      }));

      return {
        ...withUpdatedBox,
        maxZIndex: nextZIndex,
      };
    }
    case 'kanban.column.add':
      return updateKanbanColumns(snapshot, command.boxId, (columns) => {
        const id = command.column.id.trim();
        const title = command.column.title.trim();

        if (!id || !title || columns.length >= MAX_KANBAN_COLUMNS) {
          return null;
        }

        if (columns.some((column) => column.id === id)) {
          return null;
        }

        const nextColumns = [...columns];
        const afterIndex = command.afterColumnId
          ? nextColumns.findIndex((column) => column.id === command.afterColumnId)
          : -1;
        nextColumns.splice(afterIndex >= 0 ? afterIndex + 1 : nextColumns.length, 0, {
          id,
          title,
        });

        return nextColumns;
      });
    case 'kanban.column.update':
      return updateKanbanColumns(snapshot, command.boxId, (columns) => {
        const title = command.title.trim();

        if (!title || !columns.some((column) => column.id === command.columnId)) {
          return null;
        }

        return columns.map((column) =>
          column.id === command.columnId ? { ...column, title } : column,
        );
      });
    case 'kanban.column.delete':
      return deleteKanbanColumn(
        snapshot,
        command.boxId,
        command.columnId,
        command.fallbackColumnId,
      );
    case 'kanban.column.move':
      return updateKanbanColumns(snapshot, command.boxId, (columns) => {
        const sourceIndex = columns.findIndex((column) => column.id === command.columnId);

        if (sourceIndex === -1) {
          return null;
        }

        const nextColumns = [...columns];
        const [column] = nextColumns.splice(sourceIndex, 1);
        const targetIndex = Math.min(Math.max(command.targetIndex, 0), nextColumns.length);
        nextColumns.splice(targetIndex, 0, column);

        return nextColumns;
      });
    case 'item.add': {
      if (!snapshot.boxesById[command.boxId]) {
        return snapshot;
      }

      return {
        ...snapshot,
        itemsById: {
          ...snapshot.itemsById,
          [command.item.id]: command.item,
        },
        itemPlacementsByBoxId: {
          ...snapshot.itemPlacementsByBoxId,
          [command.boxId]: [
            ...(snapshot.itemPlacementsByBoxId[command.boxId] ?? []),
            {
              itemId: command.item.id,
              isPinned: command.isPinned ?? false,
              ...(command.columnId ? { columnId: command.columnId } : {}),
            },
          ],
        },
      };
    }
    case 'item.update': {
      const item = snapshot.itemsById[command.itemId];

      if (!item) {
        return snapshot;
      }

      return {
        ...snapshot,
        itemsById: {
          ...snapshot.itemsById,
          [command.itemId]: updateWorkspaceItem(item, command.updates),
        },
      };
    }
    case 'item.delete': {
      const itemPlacementsByBoxId = Object.fromEntries(
        Object.entries(snapshot.itemPlacementsByBoxId).map(([boxId, placements]) => [
          boxId,
          command.boxId && command.boxId !== boxId
            ? placements
            : placements.filter((placement) => placement.itemId !== command.itemId),
        ]),
      );

      return pruneUnplacedItems({
        ...snapshot,
        itemPlacementsByBoxId,
      });
    }
    case 'item.setPinned': {
      const placements = snapshot.itemPlacementsByBoxId[command.boxId];

      if (!placements) {
        return snapshot;
      }

      return {
        ...snapshot,
        itemPlacementsByBoxId: {
          ...snapshot.itemPlacementsByBoxId,
          [command.boxId]: placements.map((placement) =>
            placement.itemId === command.itemId
              ? { ...placement, isPinned: command.isPinned }
              : placement,
          ),
        },
      };
    }
    case 'item.move':
      return moveWorkspaceItem(
        snapshot,
        command.itemId,
        command.sourceBoxId,
        command.targetBoxId,
        command.targetIndex,
        command.targetColumnId,
      );
    default:
      return snapshot;
  }
}

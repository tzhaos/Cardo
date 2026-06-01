import { updateWorkspaceItem, type WorkspaceItem } from '../../items/model/item';
import { createWorkspaceSnapshot } from './createInitialWorkspaceSnapshot';
import { areAllBoxesMinimized } from './workspaceSelectors';
import type {
  BoxDesktopViewState,
  BoxItemPlacement,
  WorkspaceBox,
  WorkspaceBoxEntity,
  WorkspaceBoxWithItems,
  WorkspaceCommand,
  WorkspaceSnapshot,
  WorkspaceSnapshotV5,
} from './workspace';

function splitBox(box: WorkspaceBox): {
  entity: WorkspaceBoxEntity;
  viewState: BoxDesktopViewState;
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
  };
}

function stripPlacedItem(item: WorkspaceBoxWithItems['items'][number]): WorkspaceItem {
  const { boxId: _boxId, isPinned: _isPinned, ...workspaceItem } = item;
  return workspaceItem;
}

function createSnapshotFromBoxesWithItems(boxes: WorkspaceBoxWithItems[]): WorkspaceSnapshotV5 {
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
      };
    });
  }

  return {
    ...snapshot,
    itemsById,
    itemPlacementsByBoxId,
  };
}

function pruneUnplacedItems(snapshot: WorkspaceSnapshotV5): WorkspaceSnapshotV5 {
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
  snapshot: WorkspaceSnapshotV5,
  boxId: string,
  updater: (viewState: BoxDesktopViewState) => BoxDesktopViewState,
): WorkspaceSnapshotV5 {
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

function moveWorkspaceItem(
  snapshot: WorkspaceSnapshotV5,
  itemId: string,
  sourceBoxId: string,
  targetBoxId: string,
  targetIndex?: number,
): WorkspaceSnapshotV5 {
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
    case 'workspace.toggleAllBoxesMinimized': {
      const nextMinimizedState = !areAllBoxesMinimized(snapshot);

      return {
        ...snapshot,
        boxViewStatesById: Object.fromEntries(
          Object.entries(snapshot.boxViewStatesById).map(([boxId, viewState]) => [
            boxId,
            {
              ...viewState,
              isMinimized: nextMinimizedState,
            },
          ]),
        ),
      };
    }
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
            role: command.updates.role ?? entity.role,
            customTitle:
              command.updates.customTitle === undefined
                ? entity.customTitle
                : command.updates.customTitle,
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
            { itemId: command.item.id, isPinned: command.isPinned ?? false },
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
      );
    default:
      return snapshot;
  }
}

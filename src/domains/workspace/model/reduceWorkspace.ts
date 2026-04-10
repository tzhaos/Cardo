import type { WorkspaceItem } from '../../items/model/item';
import { createWorkspaceSnapshot } from './createInitialWorkspaceSnapshot';
import { areAllBoxesMinimized } from './workspaceSelectors';
import type { WorkspaceBox, WorkspaceCommand, WorkspaceSnapshotV4 } from './workspace';

function updateBox(
  snapshot: WorkspaceSnapshotV4,
  boxId: string,
  updater: (box: WorkspaceBox) => WorkspaceBox,
) {
  const box = snapshot.boxesById[boxId];

  if (!box) {
    return snapshot;
  }

  return {
    ...snapshot,
    boxesById: {
      ...snapshot.boxesById,
      [boxId]: updater(box),
    },
  };
}

function updateItem(
  snapshot: WorkspaceSnapshotV4,
  boxId: string,
  itemId: string,
  updater: (item: WorkspaceItem) => WorkspaceItem,
) {
  return updateBox(snapshot, boxId, (box) => ({
    ...box,
    items: box.items.map((item) => (item.id === itemId ? updater(item) : item)),
  }));
}

function moveWorkspaceItem(
  snapshot: WorkspaceSnapshotV4,
  itemId: string,
  sourceBoxId: string,
  targetBoxId: string,
  targetIndex?: number,
) {
  const sourceBox = snapshot.boxesById[sourceBoxId];
  const targetBox = snapshot.boxesById[targetBoxId];

  if (!sourceBox || !targetBox) {
    return snapshot;
  }

  const sourceItems = [...sourceBox.items];
  const itemIndex = sourceItems.findIndex((item) => item.id === itemId);

  if (itemIndex === -1) {
    return snapshot;
  }

  const [removedItem] = sourceItems.splice(itemIndex, 1);
  const boxesById = { ...snapshot.boxesById };

  if (sourceBoxId === targetBoxId) {
    const adjustedIndex =
      targetIndex === undefined
        ? sourceItems.length
        : targetIndex > itemIndex
          ? targetIndex - 1
          : targetIndex;
    const referenceItem = sourceItems[adjustedIndex] ?? sourceItems[adjustedIndex - 1] ?? null;
    const movedItem = {
      ...removedItem,
      isPinned:
        targetIndex === undefined ? false : (referenceItem?.isPinned ?? removedItem.isPinned),
    };

    sourceItems.splice(adjustedIndex, 0, movedItem);
    boxesById[sourceBoxId] = {
      ...sourceBox,
      items: sourceItems,
    };
  } else {
    const targetItems = [...targetBox.items];
    const referenceItem =
      targetIndex === undefined
        ? null
        : (targetItems[targetIndex] ?? targetItems[targetIndex - 1] ?? null);
    const movedItem = {
      ...removedItem,
      isPinned:
        targetIndex === undefined ? false : (referenceItem?.isPinned ?? removedItem.isPinned),
    };

    if (targetIndex === undefined) {
      targetItems.push(movedItem);
    } else {
      targetItems.splice(targetIndex, 0, movedItem);
    }

    boxesById[sourceBoxId] = {
      ...sourceBox,
      items: sourceItems,
    };
    boxesById[targetBoxId] = {
      ...targetBox,
      items: targetItems,
    };
  }

  return {
    ...snapshot,
    boxesById,
  };
}

export function reduceWorkspace(
  snapshot: WorkspaceSnapshotV4,
  command: WorkspaceCommand,
): WorkspaceSnapshotV4 {
  switch (command.type) {
    case 'workspace.replaceBoxes':
      return createWorkspaceSnapshot(command.boxes);
    case 'workspace.toggleAllBoxesMinimized': {
      const nextMinimizedState = !areAllBoxesMinimized(snapshot);
      const boxesById = Object.fromEntries(
        Object.entries(snapshot.boxesById).map(([boxId, box]) => [
          boxId,
          {
            ...box,
            isMinimized: nextMinimizedState,
          },
        ]),
      );

      return {
        ...snapshot,
        boxesById,
      };
    }
    case 'box.create':
      return {
        ...snapshot,
        boxesById: {
          ...snapshot.boxesById,
          [command.box.id]: command.box,
        },
        boxOrder: [...snapshot.boxOrder, command.box.id],
        maxZIndex: Math.max(snapshot.maxZIndex, command.box.zIndex),
      };
    case 'box.update':
      return updateBox(snapshot, command.boxId, (box) => ({
        ...box,
        ...command.updates,
        bounds: command.updates.bounds ? { ...box.bounds, ...command.updates.bounds } : box.bounds,
      }));
    case 'box.delete': {
      if (!snapshot.boxesById[command.boxId]) {
        return snapshot;
      }

      const boxesById = { ...snapshot.boxesById };
      delete boxesById[command.boxId];

      return {
        ...snapshot,
        boxesById,
        boxOrder: snapshot.boxOrder.filter((boxId) => boxId !== command.boxId),
      };
    }
    case 'box.bringToFront': {
      const nextZIndex = snapshot.maxZIndex + 1;
      const withUpdatedBox = updateBox(snapshot, command.boxId, (box) => ({
        ...box,
        zIndex: nextZIndex,
      }));

      return {
        ...withUpdatedBox,
        maxZIndex: nextZIndex,
      };
    }
    case 'item.add':
      return updateBox(snapshot, command.boxId, (box) => ({
        ...box,
        items: [...box.items, command.item],
      }));
    case 'item.update':
      return updateItem(snapshot, command.boxId, command.itemId, (item) => ({
        ...item,
        ...command.updates,
      }));
    case 'item.delete':
      return updateBox(snapshot, command.boxId, (box) => ({
        ...box,
        items: box.items.filter((item) => item.id !== command.itemId),
      }));
    case 'item.setPinned':
      return updateItem(snapshot, command.boxId, command.itemId, (item) => ({
        ...item,
        isPinned: command.isPinned,
      }));
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

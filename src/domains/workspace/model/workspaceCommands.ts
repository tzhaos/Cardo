import { createItemFromText } from '../../items/services/createItem';
import { DEFAULT_NEW_BOX_TITLE } from './boxTitles';
import { DEFAULT_BOX_THEME } from './defaultBoxes';
import { createWorkspaceDataState, findBoxByRole, type WorkspaceDataState } from './workspaceState';
import type { BoxData } from '../../../types/box';
import type { BoxItemData } from '../../../types/item';

interface WorkspaceSnapshotLike extends WorkspaceDataState {}

interface CreateBoxOptions {
  viewportWidth: number;
  viewportHeight: number;
  createId?: () => string;
}

function updateBoxById(
  snapshot: WorkspaceSnapshotLike,
  boxId: string,
  updater: (box: BoxData) => BoxData,
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

export function bringBoxToFront(snapshot: WorkspaceSnapshotLike, boxId: string) {
  const nextZIndex = snapshot.maxZIndex + 1;

  return {
    ...updateBoxById(snapshot, boxId, (box) => ({ ...box, zIndex: nextZIndex })),
    maxZIndex: nextZIndex,
  };
}

export function updateBox(snapshot: WorkspaceSnapshotLike, boxId: string, updates: Partial<BoxData>) {
  return updateBoxById(snapshot, boxId, (box) => ({ ...box, ...updates }));
}

export function toggleBoxMinimize(snapshot: WorkspaceSnapshotLike, boxId: string) {
  return updateBoxById(snapshot, boxId, (box) => ({ ...box, isMinimized: !box.isMinimized }));
}

export function deleteBox(snapshot: WorkspaceSnapshotLike, boxId: string) {
  if (!snapshot.boxesById[boxId]) {
    return snapshot;
  }

  const nextBoxesById = { ...snapshot.boxesById };
  delete nextBoxesById[boxId];

  return {
    ...snapshot,
    boxesById: nextBoxesById,
    boxOrder: snapshot.boxOrder.filter((currentBoxId) => currentBoxId !== boxId),
  };
}

export function createBox(snapshot: WorkspaceSnapshotLike, options: CreateBoxOptions) {
  const nextZIndex = snapshot.maxZIndex + 1;
  const createId = options.createId ?? (() => `box-${Date.now()}`);

  const newBox: BoxData = {
    id: createId(),
    role: null,
    title: DEFAULT_NEW_BOX_TITLE,
    titleKey: null,
    x: options.viewportWidth / 2 - 160,
    y: options.viewportHeight / 2 - 200,
    width: 320,
    height: 400,
    theme: DEFAULT_BOX_THEME,
    isLocked: false,
    isMinimized: false,
    layout: 'list',
    zIndex: nextZIndex,
    items: [],
  };

  return {
    ...snapshot,
    boxesById: {
      ...snapshot.boxesById,
      [newBox.id]: newBox,
    },
    boxOrder: [...snapshot.boxOrder, newBox.id],
    maxZIndex: nextZIndex,
    createdBox: newBox,
  };
}

export function toggleAllBoxesMinimized(snapshot: WorkspaceSnapshotLike) {
  const allMinimized = snapshot.boxOrder.every((boxId) => snapshot.boxesById[boxId]?.isMinimized);
  const boxesById = { ...snapshot.boxesById };

  for (const boxId of snapshot.boxOrder) {
    const box = boxesById[boxId];

    if (!box) {
      continue;
    }

    boxesById[boxId] = {
      ...box,
      isMinimized: !allMinimized,
    };
  }

  return {
    ...snapshot,
    boxesById,
    areBoxesNowMinimized: !allMinimized,
  };
}

export function addPastedItem(
  snapshot: WorkspaceSnapshotLike,
  activeBoxId: string | null,
  text: string,
) {
  const newItem = createItemFromText(text);
  const targetRole = newItem.type === 'url' ? 'links' : 'notes';

  let targetBox = activeBoxId ? snapshot.boxesById[activeBoxId] ?? null : null;

  if (!targetBox) {
    targetBox = findBoxByRole(snapshot, targetRole);
  }

  if (!targetBox) {
    const firstBoxId = snapshot.boxOrder[0];
    targetBox = firstBoxId ? snapshot.boxesById[firstBoxId] ?? null : null;
  }

  if (!targetBox) {
    return {
      ...snapshot,
      targetBoxId: null,
    };
  }

  return {
    ...addItem(snapshot, targetBox.id, newItem),
    targetBoxId: targetBox.id,
  };
}

export function addItem(snapshot: WorkspaceSnapshotLike, boxId: string, item: BoxItemData) {
  return updateBoxById(snapshot, boxId, (box) => ({
    ...box,
    items: [...box.items, item],
  }));
}

export function updateItem(
  snapshot: WorkspaceSnapshotLike,
  boxId: string,
  itemId: string,
  updates: Partial<BoxItemData>,
) {
  return updateBoxById(snapshot, boxId, (box) => ({
    ...box,
    items: box.items.map((item) => (item.id === itemId ? { ...item, ...updates } : item)),
  }));
}

export function deleteItem(snapshot: WorkspaceSnapshotLike, boxId: string, itemId: string) {
  return updateBoxById(snapshot, boxId, (box) => ({
    ...box,
    items: box.items.filter((item) => item.id !== itemId),
  }));
}

export function setItemPinned(
  snapshot: WorkspaceSnapshotLike,
  boxId: string,
  itemId: string,
  isPinned: boolean,
) {
  return updateItem(snapshot, boxId, itemId, { isPinned });
}

export function moveItem(
  snapshot: WorkspaceSnapshotLike,
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

  const nextSourceBox = { ...sourceBox, items: [...sourceBox.items] };
  const itemIndex = nextSourceBox.items.findIndex((item) => item.id === itemId);

  if (itemIndex === -1) {
    return snapshot;
  }

  const [item] = nextSourceBox.items.splice(itemIndex, 1);
  const boxesById = { ...snapshot.boxesById };

  if (sourceBoxId === targetBoxId) {
    if (targetIndex !== undefined) {
      const adjustedIndex = targetIndex > itemIndex ? targetIndex - 1 : targetIndex;
      const referenceItem =
        nextSourceBox.items[adjustedIndex] || nextSourceBox.items[adjustedIndex - 1];

      if (referenceItem) {
        item.isPinned = referenceItem.isPinned;
      }

      nextSourceBox.items.splice(adjustedIndex, 0, item);
    } else {
      item.isPinned = false;
      nextSourceBox.items.push(item);
    }

    boxesById[sourceBoxId] = nextSourceBox;
  } else {
    const nextTargetBox = { ...targetBox, items: [...targetBox.items] };

    if (targetIndex !== undefined) {
      const referenceItem = nextTargetBox.items[targetIndex] || nextTargetBox.items[targetIndex - 1];

      if (referenceItem) {
        item.isPinned = referenceItem.isPinned;
      }

      nextTargetBox.items.splice(targetIndex, 0, item);
    } else {
      item.isPinned = false;
      nextTargetBox.items.push(item);
    }

    boxesById[sourceBoxId] = nextSourceBox;
    boxesById[targetBoxId] = nextTargetBox;
  }

  return {
    ...snapshot,
    boxesById,
  };
}

export function replaceBoxes(boxes: BoxData[]) {
  return createWorkspaceDataState(boxes);
}

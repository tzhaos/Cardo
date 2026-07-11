import {
  getWorkspaceCommandDefinition,
  parseWorkspaceCommand,
  type WorkspaceCommand,
} from '../../core/contracts/workspaceCommands';
import { createItem as createWorkspaceItem } from './factories';
import {
  addBox,
  addBoxToCollection,
  addItem,
  addPage,
  constrainWorkspaceFramesToViewport,
  deleteBox,
  deleteItem,
  deletePage,
  moveBoxToPage,
  moveItemBetweenBoxes,
  promoteTemporaryBox,
  removeBoxFromCollection,
  renameBox,
  renameItem,
  renamePage,
  reorderItems,
  reorderPages,
  setBookmarkFavicon,
  setBoxAppearance,
  setBoxDetailMode,
  setBoxLocked,
  setBoxPreset,
  setBoxViewMode,
  setDefaultPage,
  setItemPinned,
  updateBoxFrame,
  updateCollectionBoxFrames,
  updateCollectionBoxView,
  updateItemContent,
  updatePageBoxFrames,
} from './reducers';
import { isSystemPageId } from './workspace';
import type { BoxItem, WorkspaceSnapshot } from './workspace';

export type { WorkspaceCommand } from '../../core/contracts/workspaceCommands';

export interface WorkspaceCommandResult {
  snapshot: WorkspaceSnapshot;
  createdPageId?: string;
  createdBoxId?: string;
  item?: BoxItem;
}

export function executeWorkspaceCommand(
  snapshot: WorkspaceSnapshot,
  input: WorkspaceCommand,
): WorkspaceCommandResult {
  const command = parseWorkspaceCommand(input);
  switch (command.type) {
    case 'workspace.import':
      return { snapshot: command.snapshot };
    case 'page.create': {
      const nextSnapshot = addPage(snapshot, command.title);
      return { snapshot: nextSnapshot, createdPageId: nextSnapshot.activePageId };
    }
    case 'page.rename':
      return { snapshot: renamePage(snapshot, command.pageId, command.title) };
    case 'page.delete':
      return { snapshot: deletePage(snapshot, command.pageId) };
    case 'page.reorder':
      return { snapshot: reorderPages(snapshot, command.orderedPageIds) };
    case 'page.setDefault':
      return { snapshot: setDefaultPage(snapshot, command.pageId) };
    case 'box.create': {
      const nextSnapshot = addBox(
        snapshot,
        command.pageId,
        command.preset,
        command.frame,
        command.title,
      );
      return { snapshot: nextSnapshot, createdBoxId: nextSnapshot.boxes.at(-1)?.id };
    }
    case 'item.paste':
      return pasteItem(snapshot, command);
    case 'box.updateFrame':
      return { snapshot: updateBoxFrame(snapshot, command.boxId, command.frame) };
    case 'collection.updateBoxFrame':
      return {
        snapshot: updateCollectionBoxView(snapshot, command.boxId, { frame: command.frame }),
      };
    case 'collection.updateView':
      return { snapshot: updateCollectionBoxView(snapshot, command.boxId, command.patch) };
    case 'canvas.arrange':
      return { snapshot: updatePageBoxFrames(snapshot, command.pageId, command.frames) };
    case 'collection.arrange':
      return { snapshot: updateCollectionBoxFrames(snapshot, command.frames) };
    case 'box.rename':
      return { snapshot: renameBox(snapshot, command.boxId, command.title) };
    case 'box.promote':
      return { snapshot: promoteTemporaryBox(snapshot, command.boxId, command.title) };
    case 'box.setDetailMode':
      return { snapshot: setBoxDetailMode(snapshot, command.boxId, command.detailMode) };
    case 'box.setLocked':
      return { snapshot: setBoxLocked(snapshot, command.boxId, command.isLocked) };
    case 'box.setAppearance':
      return {
        snapshot: setBoxAppearance(snapshot, command.boxId, {
          icon: command.icon,
          accent: command.accent,
        }),
      };
    case 'box.setPreset':
      return { snapshot: setBoxPreset(snapshot, command.boxId, command.preset) };
    case 'box.setViewMode':
      return { snapshot: setBoxViewMode(snapshot, command.boxId, command.viewMode) };
    case 'box.moveToPage':
      return {
        snapshot: moveBoxToPage(snapshot, command.boxId, command.pageId, command.frame),
      };
    case 'box.collect':
      return { snapshot: addBoxToCollection(snapshot, command.boxId) };
    case 'box.removeFromCollection':
      return { snapshot: removeBoxFromCollection(snapshot, command.boxId) };
    case 'item.moveBetweenBoxes':
      return {
        snapshot: moveItemBetweenBoxes(
          snapshot,
          command.sourceBoxId,
          command.targetBoxId,
          command.itemId,
          command.targetIndex,
        ),
      };
    case 'box.delete':
      return { snapshot: deleteBox(snapshot, command.boxId) };
    case 'item.create': {
      const item = createWorkspaceItem(command.itemType, command.draft);
      return { snapshot: addItem(snapshot, command.boxId, item), item };
    }
    case 'item.rename':
      return {
        snapshot: renameItem(snapshot, command.boxId, command.itemId, command.title),
      };
    case 'item.editContent':
      return {
        snapshot: updateItemContent(snapshot, command.boxId, command.itemId, command.content),
      };
    case 'item.setPinned':
      return {
        snapshot: setItemPinned(snapshot, command.boxId, command.itemId, command.isPinned),
      };
    case 'item.reorder':
      return { snapshot: reorderItems(snapshot, command.boxId, command.orderedItemIds) };
    case 'item.delete':
      return { snapshot: deleteItem(snapshot, command.boxId, command.itemId) };
    case 'bookmark.setFavicon':
      return {
        snapshot: setBookmarkFavicon(snapshot, command.boxId, command.itemId, command.favicon),
      };
    case 'system.constrainFrames':
      return { snapshot: constrainWorkspaceFramesToViewport(snapshot, command.viewport) };
  }
}

export function isUndoableWorkspaceCommand(command: WorkspaceCommand) {
  return getWorkspaceCommandDefinition(command.type).undoable;
}

function pasteItem(
  snapshot: WorkspaceSnapshot,
  command: Extract<WorkspaceCommand, { type: 'item.paste' }>,
): WorkspaceCommandResult {
  if (
    isSystemPageId(command.pageId) ||
    !snapshot.pages.some((page) => page.id === command.pageId)
  ) {
    return { snapshot };
  }

  const existingTarget = command.targetBoxId
    ? snapshot.boxes.find((box) => box.id === command.targetBoxId && box.pageId === command.pageId)
    : undefined;
  const snapshotWithTarget = existingTarget
    ? snapshot
    : addBox(snapshot, command.pageId, 'general', command.temporaryFrame, '', 'temporary');
  const boxId = existingTarget?.id ?? snapshotWithTarget.boxes.at(-1)?.id;
  if (!boxId) return { snapshot };

  const item = createWorkspaceItem(command.itemType, command.draft);
  return {
    snapshot: { ...addItem(snapshotWithTarget, boxId, item), activePageId: command.pageId },
    createdBoxId: boxId,
    item,
  };
}

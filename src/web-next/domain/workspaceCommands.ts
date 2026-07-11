import type { CanvasViewportSize } from './canvasGeometry';
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
import type {
  BoxFrame,
  BoxItem,
  WorkspaceBoxDetailMode,
  WorkspaceBoxIcon,
  WorkspaceBoxPreset,
  WorkspaceBoxViewMode,
  WorkspaceItemType,
  WorkspaceSnapshot,
} from './workspace';

export type WorkspaceCommand =
  | { type: 'workspace.import'; snapshot: WorkspaceSnapshot }
  | { type: 'page.create'; title: string }
  | { type: 'page.rename'; pageId: string; title: string }
  | { type: 'page.delete'; pageId: string }
  | { type: 'page.reorder'; orderedPageIds: string[] }
  | { type: 'page.setDefault'; pageId: string }
  | {
      type: 'box.create';
      pageId: string;
      preset: WorkspaceBoxPreset;
      frame: BoxFrame;
      title?: string;
    }
  | {
      type: 'item.paste';
      pageId: string;
      targetBoxId: string | null;
      temporaryFrame: BoxFrame;
      itemType: WorkspaceItemType;
      draft: Record<string, string>;
    }
  | { type: 'box.updateFrame'; boxId: string; frame: BoxFrame }
  | { type: 'collection.updateBoxFrame'; boxId: string; frame: BoxFrame }
  | {
      type: 'collection.updateView';
      boxId: string;
      patch: {
        viewMode?: WorkspaceBoxViewMode;
        detailMode?: WorkspaceBoxDetailMode;
        order?: number;
      };
    }
  | { type: 'canvas.arrange'; pageId: string; frames: Record<string, BoxFrame> }
  | { type: 'collection.arrange'; frames: Record<string, BoxFrame> }
  | { type: 'box.rename'; boxId: string; title: string }
  | { type: 'box.promote'; boxId: string; title: string }
  | { type: 'box.setDetailMode'; boxId: string; detailMode: WorkspaceBoxDetailMode }
  | { type: 'box.setLocked'; boxId: string; isLocked: boolean }
  | { type: 'box.setAppearance'; boxId: string; icon?: WorkspaceBoxIcon; accent?: string }
  | { type: 'box.setPreset'; boxId: string; preset: WorkspaceBoxPreset }
  | { type: 'box.setViewMode'; boxId: string; viewMode: WorkspaceBoxViewMode }
  | { type: 'box.moveToPage'; boxId: string; pageId: string; frame?: BoxFrame }
  | { type: 'box.collect'; boxId: string }
  | { type: 'box.removeFromCollection'; boxId: string }
  | {
      type: 'item.moveBetweenBoxes';
      sourceBoxId: string;
      targetBoxId: string;
      itemId: string;
      targetIndex?: number;
    }
  | { type: 'box.delete'; boxId: string }
  | {
      type: 'item.create';
      boxId: string;
      itemType: WorkspaceItemType;
      draft: Record<string, string>;
    }
  | { type: 'item.rename'; boxId: string; itemId: string; title: string }
  | { type: 'item.editContent'; boxId: string; itemId: string; content: string }
  | { type: 'item.setPinned'; boxId: string; itemId: string; isPinned: boolean }
  | { type: 'item.reorder'; boxId: string; orderedItemIds: string[] }
  | { type: 'item.delete'; boxId: string; itemId: string }
  | { type: 'bookmark.setFavicon'; boxId: string; itemId: string; favicon: string }
  | { type: 'system.constrainFrames'; viewport: CanvasViewportSize };

export interface WorkspaceCommandResult {
  snapshot: WorkspaceSnapshot;
  createdPageId?: string;
  createdBoxId?: string;
  item?: BoxItem;
}

export function executeWorkspaceCommand(
  snapshot: WorkspaceSnapshot,
  command: WorkspaceCommand,
): WorkspaceCommandResult {
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
  return command.type !== 'bookmark.setFavicon' && command.type !== 'system.constrainFrames';
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

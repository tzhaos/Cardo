import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { webNextStorage } from '../../platform/hostPlatform';
import {
  recordOperation,
  type OperationCategory,
  type OperationDraft,
  type OperationSource,
  type OperationTarget,
} from './operationJournalStore';
import { createDefaultWorkspace } from '../../domain/factories';
import { restoreWorkspaceSnapshot } from '../../domain/persistence';
import type {
  BoxFrame,
  BoxItem,
  WorkspaceBoxDetailMode,
  WorkspaceBoxIcon,
  WorkspaceBoxPreset,
  WorkspaceItemType,
  WorkspaceBoxViewMode,
  WorkspaceSnapshot,
} from '../../domain/workspace';
import type { CanvasViewportSize } from '../../domain/canvasGeometry';
import { setActivePage } from '../../domain/reducers';
import {
  executeWorkspaceCommand,
  isUndoableWorkspaceCommand,
  type WorkspaceCommand,
  type WorkspaceCommandResult,
} from '../../domain/workspaceCommands';

interface WorkspaceStore {
  snapshot: WorkspaceSnapshot;
  historyPast: WorkspaceHistoryEntry[];
  historyFuture: WorkspaceHistoryEntry[];
  dispatchCommand: (command: WorkspaceCommand) => WorkspaceCommandResult;
  replaceSnapshot: (snapshot: WorkspaceSnapshot) => void;
  createPage: (title?: string) => string;
  renamePage: (pageId: string, title: string) => void;
  deletePage: (pageId: string) => void;
  reorderPages: (orderedPageIds: string[]) => void;
  setActivePage: (pageId: string, origin?: string) => void;
  setDefaultPage: (pageId: string) => void;
  createBox: (preset: WorkspaceBoxPreset, frame: BoxFrame, title?: string) => void;
  pasteItem: (
    pageId: string,
    targetBoxId: string | null,
    temporaryFrame: BoxFrame,
    type: WorkspaceItemType,
    draft: Record<string, string>,
  ) => { boxId: string; item: BoxItem };
  updateBoxFrame: (boxId: string, frame: BoxFrame) => void;
  updateCollectionBoxFrame: (boxId: string, frame: BoxFrame) => void;
  updateCollectionBoxView: (
    boxId: string,
    patch: { viewMode?: WorkspaceBoxViewMode; detailMode?: WorkspaceBoxDetailMode; order?: number },
  ) => void;
  applyPageBoxLayout: (pageId: string, frames: Record<string, BoxFrame>) => void;
  applyCollectionBoxLayout: (frames: Record<string, BoxFrame>) => void;
  undo: () => void;
  redo: () => void;
  constrainFramesToViewport: (viewport: CanvasViewportSize) => void;
  renameBox: (boxId: string, title: string) => void;
  promoteTemporaryBox: (boxId: string, title: string) => void;
  setBoxDetailMode: (boxId: string, detailMode: WorkspaceBoxDetailMode) => void;
  setBoxLocked: (boxId: string, isLocked: boolean) => void;
  setBoxAppearance: (
    boxId: string,
    appearance: { icon?: WorkspaceBoxIcon; accent?: string },
  ) => void;
  setBoxPreset: (boxId: string, preset: WorkspaceBoxPreset) => void;
  setBoxViewMode: (boxId: string, viewMode: WorkspaceBoxViewMode) => void;
  moveBoxToPage: (boxId: string, pageId: string, frame?: BoxFrame) => void;
  addBoxToCollection: (boxId: string) => void;
  removeBoxFromCollection: (boxId: string) => void;
  moveItemBetweenBoxes: (
    sourceBoxId: string,
    targetBoxId: string,
    itemId: string,
    targetIndex?: number,
  ) => void;
  deleteBox: (boxId: string) => void;
  createItem: (boxId: string, type: WorkspaceItemType, draft: Record<string, string>) => BoxItem;
  renameItem: (boxId: string, itemId: string, title: string) => void;
  updateItemContent: (boxId: string, itemId: string, content: string) => void;
  setItemPinned: (boxId: string, itemId: string, isPinned: boolean) => void;
  setBookmarkFavicon: (boxId: string, itemId: string, favicon: string) => void;
  reorderItems: (boxId: string, orderedItemIds: string[]) => void;
  deleteItem: (boxId: string, itemId: string) => void;
}

interface WorkspaceHistoryEntry {
  before: WorkspaceSnapshot;
  after: WorkspaceSnapshot;
  action: string;
  eventId: string;
  redoNavigationPageId?: string;
}

const HISTORY_LIMIT = 50;

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      snapshot: createDefaultWorkspace(),
      historyPast: [],
      historyFuture: [],
      dispatchCommand: (command) => {
        let result: WorkspaceCommandResult = { snapshot: get().snapshot };
        set((state) => {
          result = executeWorkspaceCommand(state.snapshot, command);
          return commitWorkspaceCommand(state, result, command);
        });
        return result;
      },
      replaceSnapshot: (snapshot) => {
        get().dispatchCommand({ type: 'workspace.import', snapshot });
      },
      createPage: (title = 'Untitled') =>
        get().dispatchCommand({ type: 'page.create', title }).createdPageId ?? '',
      renamePage: (pageId, title) => {
        get().dispatchCommand({ type: 'page.rename', pageId, title });
      },
      deletePage: (pageId) => {
        get().dispatchCommand({ type: 'page.delete', pageId });
      },
      reorderPages: (orderedPageIds) => {
        get().dispatchCommand({ type: 'page.reorder', orderedPageIds });
      },
      setActivePage: (pageId, origin = 'navigation') =>
        set((state) => {
          const nextSnapshot = setActivePage(state.snapshot, pageId);
          if (nextSnapshot === state.snapshot || state.snapshot.activePageId === pageId)
            return state;
          recordOperation({
            ...operation('page.open', getPageTarget(nextSnapshot, pageId), { origin }),
            category: 'activity',
          });
          return { snapshot: nextSnapshot };
        }),
      setDefaultPage: (pageId) => {
        get().dispatchCommand({ type: 'page.setDefault', pageId });
      },
      createBox: (preset, frame, title) => {
        get().dispatchCommand({
          type: 'box.create',
          pageId: get().snapshot.activePageId,
          preset,
          frame,
          title,
        });
      },
      pasteItem: (pageId, targetBoxId, temporaryFrame, itemType, draft) => {
        const result = get().dispatchCommand({
          type: 'item.paste',
          pageId,
          targetBoxId,
          temporaryFrame,
          itemType,
          draft,
        });
        return requireCreatedItem(result, 'item.paste');
      },
      updateBoxFrame: (boxId, frame) => {
        get().dispatchCommand({ type: 'box.updateFrame', boxId, frame });
      },
      updateCollectionBoxFrame: (boxId, frame) => {
        get().dispatchCommand({ type: 'collection.updateBoxFrame', boxId, frame });
      },
      updateCollectionBoxView: (boxId, patch) => {
        get().dispatchCommand({ type: 'collection.updateView', boxId, patch });
      },
      applyPageBoxLayout: (pageId, frames) => {
        get().dispatchCommand({ type: 'canvas.arrange', pageId, frames });
      },
      applyCollectionBoxLayout: (frames) => {
        get().dispatchCommand({ type: 'collection.arrange', frames });
      },
      undo: () =>
        set((state) => {
          const entry = state.historyPast.at(-1);
          if (!entry) return state;
          recordOperation({
            ...operation('history.undo', undefined, { action: entry.action }, 'undo'),
            relatedEventId: entry.eventId,
          });
          return {
            snapshot: entry.before,
            historyPast: state.historyPast.slice(0, -1),
            historyFuture: [
              ...state.historyFuture,
              { ...entry, redoNavigationPageId: state.snapshot.activePageId },
            ].slice(-HISTORY_LIMIT),
          };
        }),
      redo: () =>
        set((state) => {
          const entry = state.historyFuture.at(-1);
          if (!entry) return state;
          recordOperation({
            ...operation('history.redo', undefined, { action: entry.action }, 'redo'),
            relatedEventId: entry.eventId,
          });
          return {
            snapshot: restoreHistoryNavigation(entry.after, entry.redoNavigationPageId),
            historyPast: [...state.historyPast, entry].slice(-HISTORY_LIMIT),
            historyFuture: state.historyFuture.slice(0, -1),
          };
        }),
      constrainFramesToViewport: (viewport) => {
        get().dispatchCommand({ type: 'system.constrainFrames', viewport });
      },
      renameBox: (boxId, title) => {
        get().dispatchCommand({ type: 'box.rename', boxId, title });
      },
      promoteTemporaryBox: (boxId, title) => {
        get().dispatchCommand({ type: 'box.promote', boxId, title });
      },
      setBoxDetailMode: (boxId, detailMode) => {
        get().dispatchCommand({ type: 'box.setDetailMode', boxId, detailMode });
      },
      setBoxLocked: (boxId, isLocked) => {
        get().dispatchCommand({ type: 'box.setLocked', boxId, isLocked });
      },
      setBoxAppearance: (boxId, appearance) => {
        get().dispatchCommand({ type: 'box.setAppearance', boxId, ...appearance });
      },
      setBoxPreset: (boxId, preset) => {
        get().dispatchCommand({ type: 'box.setPreset', boxId, preset });
      },
      setBoxViewMode: (boxId, viewMode) => {
        get().dispatchCommand({ type: 'box.setViewMode', boxId, viewMode });
      },
      moveBoxToPage: (boxId, pageId, frame) => {
        get().dispatchCommand({ type: 'box.moveToPage', boxId, pageId, frame });
      },
      addBoxToCollection: (boxId) => {
        get().dispatchCommand({ type: 'box.collect', boxId });
      },
      removeBoxFromCollection: (boxId) => {
        get().dispatchCommand({ type: 'box.removeFromCollection', boxId });
      },
      moveItemBetweenBoxes: (sourceBoxId, targetBoxId, itemId, targetIndex) => {
        get().dispatchCommand({
          type: 'item.moveBetweenBoxes',
          sourceBoxId,
          targetBoxId,
          itemId,
          targetIndex,
        });
      },
      deleteBox: (boxId) => {
        get().dispatchCommand({ type: 'box.delete', boxId });
      },
      createItem: (boxId, itemType, draft) =>
        requireCreatedItem(
          get().dispatchCommand({ type: 'item.create', boxId, itemType, draft }),
          'item.create',
        ).item,
      renameItem: (boxId, itemId, title) => {
        get().dispatchCommand({ type: 'item.rename', boxId, itemId, title });
      },
      updateItemContent: (boxId, itemId, content) => {
        get().dispatchCommand({ type: 'item.editContent', boxId, itemId, content });
      },
      setItemPinned: (boxId, itemId, isPinned) => {
        get().dispatchCommand({ type: 'item.setPinned', boxId, itemId, isPinned });
      },
      setBookmarkFavicon: (boxId, itemId, favicon) => {
        get().dispatchCommand({ type: 'bookmark.setFavicon', boxId, itemId, favicon });
      },
      reorderItems: (boxId, orderedItemIds) => {
        get().dispatchCommand({ type: 'item.reorder', boxId, orderedItemIds });
      },
      deleteItem: (boxId, itemId) => {
        get().dispatchCommand({ type: 'item.delete', boxId, itemId });
      },
    }),
    {
      name: 'khaosbox.web-next.workspace',
      version: 3,
      storage: createJSONStorage(() => webNextStorage),
      skipHydration: true,
      partialize: ({ snapshot }) => ({ snapshot }),
      merge: (persistedState, currentState) => {
        const persistedSnapshot = (persistedState as Partial<WorkspaceStore> | undefined)?.snapshot;
        return {
          ...currentState,
          snapshot: restoreWorkspaceSnapshot(persistedSnapshot, currentState.snapshot),
        };
      },
    },
  ),
);

function commitWorkspaceCommand(
  state: WorkspaceStore,
  result: WorkspaceCommandResult,
  command: WorkspaceCommand,
): WorkspaceStore | Partial<WorkspaceStore> {
  if (result.snapshot === state.snapshot) return state;

  const journalEvent = createCommandOperation(command, state.snapshot, result);
  if (!journalEvent) return { snapshot: result.snapshot };
  const undoable = isUndoableWorkspaceCommand(command);
  const eventId = recordOperation({ ...journalEvent, undoable });
  if (!undoable) return { snapshot: result.snapshot };

  const entry = {
    before: state.snapshot,
    after: result.snapshot,
    action: command.type,
    eventId,
  };
  return {
    snapshot: result.snapshot,
    historyPast: [...state.historyPast, entry].slice(-HISTORY_LIMIT),
    historyFuture: [],
  };
}

function restoreHistoryNavigation(snapshot: WorkspaceSnapshot, pageId?: string) {
  return pageId && snapshot.pages.some((page) => page.id === pageId)
    ? { ...snapshot, activePageId: pageId }
    : snapshot;
}

function requireCreatedItem(result: WorkspaceCommandResult, commandType: string) {
  if (!result.item) {
    throw new Error(`${commandType} completed without an item result`);
  }
  return { boxId: result.createdBoxId ?? '', item: result.item };
}

function operation(
  action: string,
  target?: OperationTarget,
  details?: OperationDraft['details'],
  source: OperationSource = 'user',
  category: OperationCategory = 'mutation',
): OperationDraft {
  return { action, target, details, source, category, undoable: false };
}

function createCommandOperation(
  command: WorkspaceCommand,
  before: WorkspaceSnapshot,
  result: WorkspaceCommandResult,
): OperationDraft | null {
  switch (command.type) {
    case 'workspace.import':
      return operation('workspace.import', undefined, undefined, 'import', 'system');
    case 'page.create':
      return operation(
        'page.create',
        result.createdPageId ? getPageTarget(result.snapshot, result.createdPageId) : undefined,
      );
    case 'page.rename':
      return operation('page.rename', getPageTarget(before, command.pageId), {
        from: before.pages.find((page) => page.id === command.pageId)?.title ?? '',
        to: command.title.trim(),
      });
    case 'page.delete':
      return operation('page.delete', getPageTarget(before, command.pageId));
    case 'page.reorder':
      return operation('page.reorder', undefined, { count: command.orderedPageIds.length });
    case 'page.setDefault':
      return operation('page.setDefault', getPageTarget(before, command.pageId));
    case 'box.create':
      return operation(
        'box.create',
        result.createdBoxId ? getBoxTarget(result.snapshot, result.createdBoxId) : undefined,
        { preset: command.preset },
      );
    case 'item.paste':
      return operation(
        'item.paste',
        result.item && result.createdBoxId
          ? getItemTargetAfterCreate(result.snapshot, result.createdBoxId, result.item)
          : undefined,
        {
          type: command.itemType,
          ...(result.item?.type === 'clipboard' ? { contentLength: result.item.text.length } : {}),
        },
      );
    case 'box.updateFrame': {
      const current = before.boxes.find((box) => box.id === command.boxId)?.frame;
      const resized =
        current &&
        (current.width !== command.frame.width || current.height !== command.frame.height);
      return operation(resized ? 'box.resize' : 'box.move', getBoxTarget(before, command.boxId), {
        x: command.frame.x,
        y: command.frame.y,
        width: command.frame.width,
        height: command.frame.height,
      });
    }
    case 'collection.updateBoxFrame': {
      const current = before.collectionViews[command.boxId]?.frame;
      const resized =
        current &&
        (current.width !== command.frame.width || current.height !== command.frame.height);
      return operation(
        `collection.${resized ? 'resize' : 'move'}`,
        getBoxTarget(before, command.boxId),
      );
    }
    case 'collection.updateView':
      return operation('collection.updateView', getBoxTarget(before, command.boxId), command.patch);
    case 'canvas.arrange':
      return operation('canvas.arrange', getPageTarget(before, command.pageId), {
        count: Object.keys(command.frames).length,
      });
    case 'collection.arrange':
      return operation('collection.arrange', undefined, {
        count: Object.keys(command.frames).length,
      });
    case 'box.rename':
      return operation('box.rename', getBoxTarget(before, command.boxId), {
        from: before.boxes.find((box) => box.id === command.boxId)?.title ?? '',
        to: command.title.trim(),
      });
    case 'box.promote':
      return operation('box.promote', getBoxTarget(before, command.boxId), {
        title: command.title,
      });
    case 'box.setDetailMode':
      return operation('box.setDetailMode', getBoxTarget(before, command.boxId), {
        detailMode: command.detailMode,
      });
    case 'box.setLocked':
      return operation('box.setLocked', getBoxTarget(before, command.boxId), {
        isLocked: command.isLocked,
      });
    case 'box.setAppearance':
      return operation('box.setAppearance', getBoxTarget(before, command.boxId), {
        ...(command.icon ? { icon: command.icon } : {}),
        ...(command.accent ? { accent: command.accent } : {}),
      });
    case 'box.setPreset':
      return operation('box.setPreset', getBoxTarget(before, command.boxId), {
        preset: command.preset,
      });
    case 'box.setViewMode':
      return operation('box.setViewMode', getBoxTarget(before, command.boxId), {
        viewMode: command.viewMode,
      });
    case 'box.moveToPage':
      return operation('box.moveToPage', getBoxTarget(before, command.boxId), {
        toPageTitle: before.pages.find((page) => page.id === command.pageId)?.title ?? '',
      });
    case 'box.collect':
      return operation('box.collect', getBoxTarget(before, command.boxId));
    case 'box.removeFromCollection':
      return operation('box.removeFromCollection', getBoxTarget(before, command.boxId));
    case 'item.moveBetweenBoxes':
      return operation(
        'item.moveBetweenBoxes',
        getItemTarget(before, command.sourceBoxId, command.itemId),
        {
          targetBoxTitle: before.boxes.find((box) => box.id === command.targetBoxId)?.title ?? '',
          targetIndex: command.targetIndex ?? -1,
        },
      );
    case 'box.delete':
      return operation('box.delete', getBoxTarget(before, command.boxId));
    case 'item.create':
      return operation(
        'item.create',
        result.item
          ? getItemTargetAfterCreate(result.snapshot, command.boxId, result.item)
          : undefined,
        {
          type: command.itemType,
          ...(result.item?.type === 'clipboard' ? { contentLength: result.item.text.length } : {}),
        },
      );
    case 'item.rename':
      return operation('item.rename', getItemTarget(before, command.boxId, command.itemId), {
        to: command.title,
      });
    case 'item.editContent':
      return operation('item.editContent', getItemTarget(before, command.boxId, command.itemId), {
        contentLength: command.content.length,
      });
    case 'item.setPinned':
      return operation('item.setPinned', getItemTarget(before, command.boxId, command.itemId), {
        isPinned: command.isPinned,
      });
    case 'item.reorder':
      return operation('item.reorder', getBoxTarget(before, command.boxId), {
        count: command.orderedItemIds.length,
      });
    case 'item.delete':
      return operation('item.delete', getItemTarget(before, command.boxId, command.itemId));
    case 'bookmark.setFavicon':
      return null;
    case 'system.constrainFrames':
      return operation(
        'canvas.constrainFrames',
        undefined,
        { width: command.viewport.width, height: command.viewport.height },
        'system',
        'system',
      );
  }
}

function getPageTarget(snapshot: WorkspaceSnapshot, pageId: string): OperationTarget | undefined {
  const page = snapshot.pages.find((candidate) => candidate.id === pageId);
  return page ? { pageId: page.id, pageTitle: page.title } : undefined;
}

function getBoxTarget(snapshot: WorkspaceSnapshot, boxId: string): OperationTarget | undefined {
  const box = snapshot.boxes.find((candidate) => candidate.id === boxId);
  if (!box) return undefined;
  const page = snapshot.pages.find((candidate) => candidate.id === box.pageId);
  return {
    pageId: box.pageId,
    pageTitle: page?.title,
    boxId: box.id,
    boxTitle: box.title,
  };
}

function getItemTarget(
  snapshot: WorkspaceSnapshot,
  boxId: string,
  itemId: string,
): OperationTarget | undefined {
  const box = snapshot.boxes.find((candidate) => candidate.id === boxId);
  const item = box?.items.find((candidate) => candidate.id === itemId);
  if (!box || !item) return undefined;
  return {
    ...getBoxTarget(snapshot, boxId),
    itemId: item.id,
    itemTitle: item.title || item.type,
  };
}

function getItemTargetAfterCreate(
  snapshot: WorkspaceSnapshot,
  boxId: string,
  item: BoxItem,
): OperationTarget | undefined {
  const boxTarget = getBoxTarget(snapshot, boxId);
  return boxTarget
    ? { ...boxTarget, itemId: item.id, itemTitle: item.title || item.type }
    : undefined;
}

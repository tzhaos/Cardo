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
import { createDefaultWorkspace, createItem } from '../../domain/factories';
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
import {
  addBoxToCollection,
  addBox,
  addItem,
  addPage,
  deleteBox,
  deleteItem,
  deletePage,
  moveBoxToPage,
  moveItemBetweenBoxes,
  removeBoxFromCollection,
  promoteTemporaryBox,
  renameBox,
  renameItem,
  renamePage,
  reorderItems,
  reorderPages,
  setActivePage,
  setBoxAppearance,
  setBoxDetailMode,
  setBoxLocked,
  setBoxPreset,
  setBoxViewMode,
  setDefaultPage,
  setItemPinned,
  setBookmarkFavicon,
  updateBoxFrame,
  updatePageBoxFrames,
  updateCollectionBoxView,
  updateCollectionBoxFrames,
  updateItemContent,
  constrainWorkspaceFramesToViewport,
} from '../../domain/reducers';

interface WorkspaceStore {
  snapshot: WorkspaceSnapshot;
  historyPast: WorkspaceHistoryEntry[];
  historyFuture: WorkspaceHistoryEntry[];
  replaceSnapshot: (snapshot: WorkspaceSnapshot) => void;
  createPage: (title?: string) => string;
  renamePage: (pageId: string, title: string) => void;
  deletePage: (pageId: string) => void;
  reorderPages: (orderedPageIds: string[]) => void;
  setActivePage: (pageId: string, origin?: string) => void;
  setDefaultPage: (pageId: string) => void;
  createBox: (preset: WorkspaceBoxPreset, frame: BoxFrame, title?: string) => void;
  createTemporaryBox: (pageId: string, frame: BoxFrame) => string;
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

export type WorkspaceHistoryAction =
  | 'deleteItem'
  | 'deleteBox'
  | 'moveBox'
  | 'resizeBox'
  | 'deletePage'
  | 'moveBoxToPage'
  | 'arrangeBoxes'
  | 'arrangeCollectionBoxes'
  | 'collectBox'
  | 'removeCollectedBox'
  | 'moveCollectionBox'
  | 'resizeCollectionBox'
  | 'importData';

interface WorkspaceHistoryEntry {
  before: WorkspaceSnapshot;
  after: WorkspaceSnapshot;
  action: WorkspaceHistoryAction;
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
      replaceSnapshot: (snapshot) =>
        set((state) =>
          recordHistory(
            state,
            snapshot,
            'importData',
            operation('workspace.import', undefined, undefined, 'import', 'system'),
          ),
        ),
      createPage: (title = 'Untitled') => {
        let createdPageId = '';
        set((state) => {
          const nextSnapshot = addPage(state.snapshot, title);
          createdPageId = nextSnapshot.activePageId;
          return recordMutation(
            state,
            nextSnapshot,
            operation('page.create', getPageTarget(nextSnapshot, createdPageId)),
          );
        });
        return createdPageId;
      },
      renamePage: (pageId, title) =>
        set((state) =>
          recordMutation(
            state,
            renamePage(state.snapshot, pageId, title),
            operation('page.rename', getPageTarget(state.snapshot, pageId), {
              from: state.snapshot.pages.find((page) => page.id === pageId)?.title ?? '',
              to: title.trim(),
            }),
          ),
        ),
      deletePage: (pageId) =>
        set((state) =>
          recordHistory(
            state,
            deletePage(state.snapshot, pageId),
            'deletePage',
            operation('page.delete', getPageTarget(state.snapshot, pageId)),
          ),
        ),
      reorderPages: (orderedPageIds) =>
        set((state) =>
          recordMutation(
            state,
            reorderPages(state.snapshot, orderedPageIds),
            operation('page.reorder', undefined, { count: orderedPageIds.length }),
          ),
        ),
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
      setDefaultPage: (pageId) =>
        set((state) =>
          recordMutation(
            state,
            setDefaultPage(state.snapshot, pageId),
            operation('page.setDefault', getPageTarget(state.snapshot, pageId)),
          ),
        ),
      createBox: (preset, frame, title) =>
        set((state) => {
          const nextSnapshot = addBox(
            state.snapshot,
            state.snapshot.activePageId,
            preset,
            frame,
            title,
          );
          const box = nextSnapshot.boxes.at(-1);
          return recordMutation(
            state,
            nextSnapshot,
            operation('box.create', box ? getBoxTarget(nextSnapshot, box.id) : undefined, {
              preset,
            }),
          );
        }),
      createTemporaryBox: (pageId, frame) => {
        let createdBoxId = '';
        set((state) => {
          const snapshot = addBox(state.snapshot, pageId, 'general', frame, '', 'temporary');
          createdBoxId = snapshot.boxes.at(-1)?.id ?? '';
          const nextSnapshot = { ...snapshot, activePageId: pageId };
          return recordMutation(
            state,
            nextSnapshot,
            operation(
              'box.temporary.create',
              getBoxTarget(nextSnapshot, createdBoxId),
              undefined,
              'system',
              'system',
            ),
          );
        });
        return createdBoxId;
      },
      updateBoxFrame: (boxId, frame) =>
        set((state) => {
          const box = state.snapshot.boxes.find((candidate) => candidate.id === boxId);
          const action =
            box && (box.frame.width !== frame.width || box.frame.height !== frame.height)
              ? 'resizeBox'
              : 'moveBox';
          return recordHistory(
            state,
            updateBoxFrame(state.snapshot, boxId, frame),
            action,
            operation(
              action === 'resizeBox' ? 'box.resize' : 'box.move',
              getBoxTarget(state.snapshot, boxId),
              { x: frame.x, y: frame.y, width: frame.width, height: frame.height },
            ),
          );
        }),
      updateCollectionBoxFrame: (boxId, frame) =>
        set((state) => {
          const current = state.snapshot.collectionViews?.[boxId]?.frame;
          const action =
            current && (current.width !== frame.width || current.height !== frame.height)
              ? 'resizeCollectionBox'
              : 'moveCollectionBox';
          return recordHistory(
            state,
            updateCollectionBoxView(state.snapshot, boxId, { frame }),
            action,
            operation(
              `collection.${action === 'resizeCollectionBox' ? 'resize' : 'move'}`,
              getBoxTarget(state.snapshot, boxId),
            ),
          );
        }),
      updateCollectionBoxView: (boxId, patch) =>
        set((state) =>
          recordMutation(
            state,
            updateCollectionBoxView(state.snapshot, boxId, patch),
            operation('collection.updateView', getBoxTarget(state.snapshot, boxId), patch),
          ),
        ),
      applyPageBoxLayout: (pageId, frames) =>
        set((state) =>
          recordHistory(
            state,
            updatePageBoxFrames(state.snapshot, pageId, frames),
            'arrangeBoxes',
            operation('canvas.arrange', getPageTarget(state.snapshot, pageId), {
              count: Object.keys(frames).length,
            }),
          ),
        ),
      applyCollectionBoxLayout: (frames) =>
        set((state) =>
          recordHistory(
            state,
            updateCollectionBoxFrames(state.snapshot, frames),
            'arrangeCollectionBoxes',
            operation('collection.arrange', undefined, { count: Object.keys(frames).length }),
          ),
        ),
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
        const snapshot = get().snapshot;
        const nextSnapshot = constrainWorkspaceFramesToViewport(snapshot, viewport);
        if (nextSnapshot !== snapshot) {
          recordOperation(
            operation(
              'canvas.constrainFrames',
              undefined,
              { width: viewport.width, height: viewport.height },
              'system',
              'system',
            ),
          );
          set({ snapshot: nextSnapshot });
        }
      },
      renameBox: (boxId, title) =>
        set((state) =>
          recordMutation(
            state,
            renameBox(state.snapshot, boxId, title),
            operation('box.rename', getBoxTarget(state.snapshot, boxId), {
              from: state.snapshot.boxes.find((box) => box.id === boxId)?.title ?? '',
              to: title.trim(),
            }),
          ),
        ),
      promoteTemporaryBox: (boxId, title) =>
        set((state) =>
          recordMutation(
            state,
            promoteTemporaryBox(state.snapshot, boxId, title),
            operation('box.promote', getBoxTarget(state.snapshot, boxId), { title }),
          ),
        ),
      setBoxDetailMode: (boxId, detailMode) =>
        set((state) =>
          recordMutation(
            state,
            setBoxDetailMode(state.snapshot, boxId, detailMode),
            operation('box.setDetailMode', getBoxTarget(state.snapshot, boxId), { detailMode }),
          ),
        ),
      setBoxLocked: (boxId, isLocked) =>
        set((state) =>
          recordMutation(
            state,
            setBoxLocked(state.snapshot, boxId, isLocked),
            operation('box.setLocked', getBoxTarget(state.snapshot, boxId), { isLocked }),
          ),
        ),
      setBoxAppearance: (boxId, appearance) =>
        set((state) =>
          recordMutation(
            state,
            setBoxAppearance(state.snapshot, boxId, appearance),
            operation('box.setAppearance', getBoxTarget(state.snapshot, boxId), {
              ...(appearance.icon ? { icon: appearance.icon } : {}),
              ...(appearance.accent ? { accent: appearance.accent } : {}),
            }),
          ),
        ),
      setBoxPreset: (boxId, preset) =>
        set((state) =>
          recordMutation(
            state,
            setBoxPreset(state.snapshot, boxId, preset),
            operation('box.setPreset', getBoxTarget(state.snapshot, boxId), { preset }),
          ),
        ),
      setBoxViewMode: (boxId, viewMode) =>
        set((state) =>
          recordMutation(
            state,
            setBoxViewMode(state.snapshot, boxId, viewMode),
            operation('box.setViewMode', getBoxTarget(state.snapshot, boxId), { viewMode }),
          ),
        ),
      moveBoxToPage: (boxId, pageId, frame) =>
        set((state) =>
          recordHistory(
            state,
            moveBoxToPage(state.snapshot, boxId, pageId, frame),
            'moveBoxToPage',
            operation('box.moveToPage', getBoxTarget(state.snapshot, boxId), {
              toPageTitle: state.snapshot.pages.find((page) => page.id === pageId)?.title ?? '',
            }),
          ),
        ),
      addBoxToCollection: (boxId) =>
        set((state) =>
          recordHistory(
            state,
            addBoxToCollection(state.snapshot, boxId),
            'collectBox',
            operation('box.collect', getBoxTarget(state.snapshot, boxId)),
          ),
        ),
      removeBoxFromCollection: (boxId) =>
        set((state) =>
          recordHistory(
            state,
            removeBoxFromCollection(state.snapshot, boxId),
            'removeCollectedBox',
            operation('box.removeFromCollection', getBoxTarget(state.snapshot, boxId)),
          ),
        ),
      moveItemBetweenBoxes: (sourceBoxId, targetBoxId, itemId, targetIndex) =>
        set((state) =>
          recordMutation(
            state,
            moveItemBetweenBoxes(state.snapshot, sourceBoxId, targetBoxId, itemId, targetIndex),
            operation('item.moveBetweenBoxes', getItemTarget(state.snapshot, sourceBoxId, itemId), {
              targetBoxTitle:
                state.snapshot.boxes.find((box) => box.id === targetBoxId)?.title ?? '',
              targetIndex: targetIndex ?? -1,
            }),
          ),
        ),
      deleteBox: (boxId) =>
        set((state) =>
          recordHistory(
            state,
            deleteBox(state.snapshot, boxId),
            'deleteBox',
            operation('box.delete', getBoxTarget(state.snapshot, boxId)),
          ),
        ),
      createItem: (boxId, type, draft) => {
        const item = createItem(type, draft as never);
        set((state) =>
          recordMutation(
            state,
            addItem(state.snapshot, boxId, item),
            operation('item.create', getItemTargetAfterCreate(state.snapshot, boxId, item), {
              type,
              ...(item.type === 'clipboard' ? { contentLength: item.text.length } : {}),
            }),
          ),
        );
        return item;
      },
      renameItem: (boxId, itemId, title) =>
        set((state) =>
          recordMutation(
            state,
            renameItem(state.snapshot, boxId, itemId, title),
            operation('item.rename', getItemTarget(state.snapshot, boxId, itemId), { to: title }),
          ),
        ),
      updateItemContent: (boxId, itemId, content) =>
        set((state) =>
          recordMutation(
            state,
            updateItemContent(state.snapshot, boxId, itemId, content),
            operation('item.editContent', getItemTarget(state.snapshot, boxId, itemId), {
              contentLength: content.length,
            }),
          ),
        ),
      setItemPinned: (boxId, itemId, isPinned) =>
        set((state) =>
          recordMutation(
            state,
            setItemPinned(state.snapshot, boxId, itemId, isPinned),
            operation('item.setPinned', getItemTarget(state.snapshot, boxId, itemId), { isPinned }),
          ),
        ),
      setBookmarkFavicon: (boxId, itemId, favicon) =>
        set((state) => {
          const nextSnapshot = setBookmarkFavicon(state.snapshot, boxId, itemId, favicon);
          return nextSnapshot === state.snapshot ? state : { snapshot: nextSnapshot };
        }),
      reorderItems: (boxId, orderedItemIds) =>
        set((state) =>
          recordMutation(
            state,
            reorderItems(state.snapshot, boxId, orderedItemIds),
            operation('item.reorder', getBoxTarget(state.snapshot, boxId), {
              count: orderedItemIds.length,
            }),
          ),
        ),
      deleteItem: (boxId, itemId) =>
        set((state) =>
          recordHistory(
            state,
            deleteItem(state.snapshot, boxId, itemId),
            'deleteItem',
            operation('item.delete', getItemTarget(state.snapshot, boxId, itemId)),
          ),
        ),
    }),
    {
      name: 'khaosbox.web-next.workspace',
      version: 1,
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

function recordHistory(
  state: WorkspaceStore,
  nextSnapshot: WorkspaceSnapshot,
  action: WorkspaceHistoryAction,
  journalEvent: OperationDraft,
): WorkspaceStore | Partial<WorkspaceStore> {
  if (nextSnapshot === state.snapshot) return state;
  const eventId = recordOperation({ ...journalEvent, undoable: true });
  const entry = { before: state.snapshot, after: nextSnapshot, action, eventId };
  return {
    snapshot: nextSnapshot,
    historyPast: [...state.historyPast, entry].slice(-HISTORY_LIMIT),
    historyFuture: [],
  };
}

function restoreHistoryNavigation(snapshot: WorkspaceSnapshot, pageId?: string) {
  return pageId && snapshot.pages.some((page) => page.id === pageId)
    ? { ...snapshot, activePageId: pageId }
    : snapshot;
}

function recordMutation(
  state: WorkspaceStore,
  nextSnapshot: WorkspaceSnapshot,
  journalEvent: OperationDraft,
): WorkspaceStore | Partial<WorkspaceStore> {
  if (nextSnapshot === state.snapshot) return state;
  recordOperation(journalEvent);
  return { snapshot: nextSnapshot };
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

import { useSyncExternalStore } from 'react';
import type { WorkspaceCommand } from '../../../core/contracts/workspaceCommands';
import { COLLECTION_PAGE_ID } from '../../../core/contracts/systemPages';
import type { DatabaseCommandResult } from '../../../core/application/commandTypes';
import type {
  BoxFrame,
  BoxItem,
  WorkspaceBoxDetailMode,
  WorkspaceBoxIcon,
  WorkspaceBoxViewMode,
  WorkspaceItemType,
  WorkspaceProjection,
} from '../../domain/workspace';
import type { CanvasViewportSize } from '../../domain/canvasGeometry';
import type { InvalidationScope } from '../../../core/contracts/runtimeProtocol';
import {
  dispatchDatabaseCommand,
  queryBoxItems,
  queryDatabaseHistoryState,
  queryPageBoxes,
  queryPageTabs,
  queryWorkspaceProjection,
  queryWorkspaceState,
  redoDatabaseHistory,
  undoDatabaseHistory,
} from '../../platform/hostPlatform';

interface WorkspaceStore {
  projection: WorkspaceProjection;
  historyPast: readonly true[];
  historyFuture: readonly true[];
  initialize: () => Promise<void>;
  dispatchCommand: (command: WorkspaceCommand) => Promise<DatabaseCommandResult>;
  importWorkspace: (workspace: WorkspaceProjection) => void;
  createPage: (title?: string) => void;
  renamePage: (pageId: string, title: string) => void;
  deletePage: (pageId: string) => void;
  reorderPages: (orderedPageIds: string[]) => void;
  setActivePage: (pageId: string, origin?: string) => void;
  setDefaultPage: (pageId: string) => void;
  createBox: (frame: BoxFrame, title?: string) => void;
  pasteItem: (
    pageId: string,
    targetBoxId: string | null,
    temporaryFrame: BoxFrame,
    type: WorkspaceItemType,
    draft: Record<string, string>,
  ) => Promise<{ boxId: string; item: BoxItem }>;
  updateBoxFrame: (boxId: string, frame: BoxFrame) => void;
  /**
   * Local-only frame write so drop remount paints the landing position immediately
   * (Runtime commit still goes through updateBoxFrame / moveBoxToPage).
   */
  previewBoxFrame: (boxId: string, frame: BoxFrame) => void;
  /** Optimistic multi-box reflow for waterfall/list before drag end clears the ghost. */
  previewBoxFrames: (frames: ReadonlyMap<string, BoxFrame>) => void;
  /** Auto-arrange for one isolated layout mode (freeform | waterfall | list). */
  arrangeBoxesOnPage: (
    pageId: string,
    frames: Record<string, BoxFrame>,
    layoutMode?: 'freeform' | 'waterfall' | 'list',
  ) => void;
  setPageGroupLayout: (
    pageId: string,
    patch: {
      groupViewMode?: 'freeform' | 'waterfall' | 'list';
      waterfallColumns?: number;
      listColumns?: number;
    },
  ) => void;
  updateCollectionBoxFrame: (boxId: string, frame: BoxFrame) => void;
  updateCollectionBoxView: (
    boxId: string,
    patch: { viewMode?: WorkspaceBoxViewMode; detailMode?: WorkspaceBoxDetailMode; order?: number },
  ) => void;
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
  setBoxViewMode: (boxId: string, viewMode: WorkspaceBoxViewMode) => void;
  moveBoxToPage: (
    boxId: string,
    pageId: string,
    frame?: BoxFrame,
  ) => Promise<DatabaseCommandResult>;
  /**
   * Local-only preview while a box is dragged across page tabs. Does not write
   * Runtime; release must commit with moveBoxToPage / updateBoxFrame.
   */
  previewBoxOnPage: (boxId: string, pageId: string, frame: BoxFrame) => void;
  /** Drop optimistic drag previews by re-querying the authoritative projection. */
  revertOptimisticProjection: () => Promise<void>;
  addBoxToCollection: (boxId: string) => void;
  removeBoxFromCollection: (boxId: string) => void;
  moveItemBetweenBoxes: (
    sourceBoxId: string,
    targetBoxId: string,
    itemId: string,
    targetIndex?: number,
  ) => void;
  deleteBox: (boxId: string) => void;
  createItem: (
    boxId: string,
    type: WorkspaceItemType,
    draft: Record<string, string>,
  ) => Promise<BoxItem>;
  renameItem: (boxId: string, itemId: string, title: string) => void;
  updateItemContent: (boxId: string, itemId: string, content: string) => void;
  setItemPinned: (boxId: string, itemId: string, isPinned: boolean) => void;
  setBookmarkFavicon: (boxId: string, itemId: string, favicon: string) => void;
  reorderItems: (boxId: string, orderedItemIds: string[]) => void;
  deleteItem: (boxId: string, itemId: string) => void;
}

const listeners = new Set<() => void>();
let commandQueue: Promise<unknown> = Promise.resolve();

const emptyProjection: WorkspaceProjection = {
  pages: [],
  activePageId: COLLECTION_PAGE_ID,
  defaultPageId: COLLECTION_PAGE_ID,
  boxes: [],
  collectionBoxIds: [],
  collectionViews: {},
};

const actions = {
  initialize: refreshProjection,
  dispatchCommand: runCommand,
  importWorkspace: (workspace: WorkspaceProjection) =>
    fireCommand({ type: 'workspace.import', workspace }),
  createPage: (title = 'Untitled') => fireCommand({ type: 'page.create', title }),
  renamePage: (pageId: string, title: string) =>
    fireCommand({ type: 'page.rename', pageId, title }),
  deletePage: (pageId: string) => fireCommand({ type: 'page.delete', pageId }),
  reorderPages: (orderedPageIds: string[]) => fireCommand({ type: 'page.reorder', orderedPageIds }),
  setActivePage: (pageId: string, _origin = 'navigation') =>
    fireCommand({ type: 'page.open', pageId }),
  setDefaultPage: (pageId: string) => fireCommand({ type: 'page.setDefault', pageId }),
  createBox: (frame: BoxFrame, title?: string) =>
    fireCommand({
      type: 'box.create',
      pageId: state.projection.activePageId,
      frame,
      title,
    }),
  pasteItem: async (
    pageId: string,
    targetBoxId: string | null,
    temporaryFrame: BoxFrame,
    itemType: WorkspaceItemType,
    draft: Record<string, string>,
  ) => {
    const result = await runCommand({
      type: 'item.paste',
      pageId,
      targetBoxId,
      temporaryFrame,
      itemType,
      draft,
    });
    return requireCreatedItem(result, 'item.paste');
  },
  updateBoxFrame: (boxId: string, frame: BoxFrame) => {
    // Optimistic so drop remount is not one frame at the pre-drag world position.
    applyOptimisticBoxFrame(boxId, frame);
    fireCommand({ type: 'box.updateFrame', boxId, frame });
  },
  previewBoxFrame: (boxId, frame) => applyOptimisticBoxFrame(boxId, frame),
  previewBoxFrames: (frames) => applyOptimisticBoxFrames(frames),
  arrangeBoxesOnPage: (pageId, frames, layoutMode = 'freeform') => {
    const ids = Object.keys(frames);
    if (ids.length === 0) return;
    if (layoutMode === 'freeform') {
      applyOptimisticBoxFrames(new Map(Object.entries(frames)));
    } else {
      applyOptimisticManagedFrames(layoutMode, frames);
    }
    fireCommand({ type: 'canvas.arrange', pageId, frames, layoutMode });
  },
  setPageGroupLayout: (pageId, patch) =>
    fireCommand({ type: 'page.setGroupLayout', pageId, ...patch }),
  updateCollectionBoxFrame: (boxId: string, frame: BoxFrame) =>
    fireCommand({ type: 'collection.updateBoxFrame', boxId, frame }),
  updateCollectionBoxView: (
    boxId: string,
    patch: { viewMode?: WorkspaceBoxViewMode; detailMode?: WorkspaceBoxDetailMode; order?: number },
  ) => fireCommand({ type: 'collection.updateView', boxId, patch }),
  undo: () => fireHistoryChange('undo'),
  redo: () => fireHistoryChange('redo'),
  constrainFramesToViewport: (viewport: CanvasViewportSize) =>
    fireCommand({ type: 'system.constrainFrames', viewport }),
  renameBox: (boxId: string, title: string) => fireCommand({ type: 'box.rename', boxId, title }),
  promoteTemporaryBox: (boxId: string, title: string) =>
    fireCommand({ type: 'box.promote', boxId, title }),
  setBoxDetailMode: (boxId: string, detailMode: WorkspaceBoxDetailMode) =>
    fireCommand({ type: 'box.setDetailMode', boxId, detailMode }),
  setBoxLocked: (boxId: string, isLocked: boolean) =>
    fireCommand({ type: 'box.setLocked', boxId, isLocked }),
  setBoxAppearance: (boxId: string, appearance: { icon?: WorkspaceBoxIcon; accent?: string }) =>
    fireCommand({ type: 'box.setAppearance', boxId, ...appearance }),
  setBoxViewMode: (boxId: string, viewMode: WorkspaceBoxViewMode) =>
    fireCommand({ type: 'box.setViewMode', boxId, viewMode }),
  moveBoxToPage: (boxId: string, pageId: string, frame?: BoxFrame) =>
    runCommand({ type: 'box.moveToPage', boxId, pageId, frame }),
  previewBoxOnPage: (boxId: string, pageId: string, frame: BoxFrame) => {
    const projection = state.projection;
    const box = projection.boxes.find((entry) => entry.id === boxId);
    if (!box) return;
    if (
      box.pageId === pageId &&
      projection.activePageId === pageId &&
      box.frame.x === frame.x &&
      box.frame.y === frame.y &&
      box.frame.width === frame.width &&
      box.frame.height === frame.height
    ) {
      return;
    }
    state = {
      ...state,
      projection: {
        ...projection,
        activePageId: pageId,
        boxes: projection.boxes.map((entry) =>
          entry.id === boxId ? { ...entry, pageId, frame: { ...frame } } : entry,
        ),
      },
    };
    emitChange();
  },
  revertOptimisticProjection: () => refreshProjection(),
  addBoxToCollection: (boxId: string) => fireCommand({ type: 'box.collect', boxId }),
  removeBoxFromCollection: (boxId: string) =>
    fireCommand({ type: 'box.removeFromCollection', boxId }),
  moveItemBetweenBoxes: (
    sourceBoxId: string,
    targetBoxId: string,
    itemId: string,
    targetIndex?: number,
  ) =>
    fireCommand({
      type: 'item.moveBetweenBoxes',
      sourceBoxId,
      targetBoxId,
      itemId,
      targetIndex,
    }),
  deleteBox: (boxId: string) => fireCommand({ type: 'box.delete', boxId }),
  createItem: async (boxId: string, itemType: WorkspaceItemType, draft: Record<string, string>) => {
    const result = await runCommand({ type: 'item.create', boxId, itemType, draft });
    return requireCreatedItem(result, 'item.create').item;
  },
  renameItem: (boxId: string, itemId: string, title: string) =>
    fireCommand({ type: 'item.rename', boxId, itemId, title }),
  updateItemContent: (boxId: string, itemId: string, content: string) =>
    fireCommand({ type: 'item.editContent', boxId, itemId, content }),
  setItemPinned: (boxId: string, itemId: string, isPinned: boolean) =>
    fireCommand({ type: 'item.setPinned', boxId, itemId, isPinned }),
  setBookmarkFavicon: (boxId: string, itemId: string, favicon: string) =>
    fireCommand({ type: 'bookmark.setFavicon', boxId, itemId, favicon }),
  reorderItems: (boxId: string, orderedItemIds: string[]) =>
    fireCommand({ type: 'item.reorder', boxId, orderedItemIds }),
  deleteItem: (boxId: string, itemId: string) =>
    fireCommand({ type: 'item.delete', boxId, itemId }),
} satisfies Omit<WorkspaceStore, 'projection' | 'historyPast' | 'historyFuture'>;

let state: WorkspaceStore = {
  projection: emptyProjection,
  historyPast: [],
  historyFuture: [],
  ...actions,
};

function applyOptimisticBoxFrame(boxId: string, frame: BoxFrame) {
  const projection = state.projection;
  const box = projection.boxes.find((entry) => entry.id === boxId);
  if (!box) return;
  if (
    box.frame.x === frame.x &&
    box.frame.y === frame.y &&
    box.frame.width === frame.width &&
    box.frame.height === frame.height
  ) {
    return;
  }
  state = {
    ...state,
    projection: {
      ...projection,
      boxes: projection.boxes.map((entry) =>
        entry.id === boxId ? { ...entry, frame: { ...frame } } : entry,
      ),
    },
  };
  emitChange();
}

function applyOptimisticBoxFrames(frames: ReadonlyMap<string, BoxFrame>) {
  if (frames.size === 0) return;
  const projection = state.projection;
  let changed = false;
  const boxes = projection.boxes.map((entry) => {
    const next = frames.get(entry.id);
    if (!next) return entry;
    if (
      entry.frame.x === next.x &&
      entry.frame.y === next.y &&
      entry.frame.width === next.width &&
      entry.frame.height === next.height
    ) {
      return entry;
    }
    changed = true;
    return { ...entry, frame: { ...next } };
  });
  if (!changed) return;
  state = { ...state, projection: { ...projection, boxes } };
  emitChange();
}

function applyOptimisticManagedFrames(
  mode: 'waterfall' | 'list',
  frames: Record<string, BoxFrame>,
) {
  const projection = state.projection;
  let changed = false;
  const boxes = projection.boxes.map((entry) => {
    const next = frames[entry.id];
    if (!next) return entry;
    const prev = entry.modeLayouts[mode];
    if (
      prev.x === next.x &&
      prev.y === next.y &&
      prev.width === next.width &&
      prev.height === next.height
    ) {
      return entry;
    }
    changed = true;
    return {
      ...entry,
      modeLayouts: { ...entry.modeLayouts, [mode]: { ...next } },
    };
  });
  if (!changed) return;
  state = { ...state, projection: { ...projection, boxes } };
  emitChange();
}

async function refreshProjection() {
  const [nextProjection, history] = await Promise.all([
    queryWorkspaceProjection(),
    queryDatabaseHistoryState(),
  ]);
  state = {
    ...state,
    projection: structurallyShare(state.projection, nextProjection),
    historyPast: history.canUndo ? [true] : [],
    historyFuture: history.canRedo ? [true] : [],
  };
  emitChange();
}

/**
 * Apply server-derived InvalidationScopes (design §6.9.2).
 * Used by RuntimeClient initiator path and remote SSE (via hostPlatform).
 */
export async function applyWorkspaceInvalidationScopes(scopes: InvalidationScope[]): Promise<void> {
  if (!scopes.length) return;

  const hasProjection = scopes.some((scope) => scope.type === 'projection');
  if (hasProjection) {
    await refreshProjection();
    return;
  }

  let nextProjection = state.projection;
  let historyTask: Promise<{ canUndo: boolean; canRedo: boolean }> | null = null;
  const needsHistory = scopes.some((scope) => scope.type === 'history');
  if (needsHistory) {
    historyTask = queryDatabaseHistoryState();
  }

  for (const scope of scopes) {
    switch (scope.type) {
      case 'workspaceState': {
        const workspaceState = await queryWorkspaceState();
        nextProjection = structurallyShare(nextProjection, {
          ...nextProjection,
          ...workspaceState,
        });
        break;
      }
      case 'pageTabs': {
        const pages = await queryPageTabs();
        nextProjection = structurallyShare(nextProjection, { ...nextProjection, pages });
        break;
      }
      case 'pageTabsAndState': {
        const [pages, workspaceState] = await Promise.all([queryPageTabs(), queryWorkspaceState()]);
        nextProjection = structurallyShare(nextProjection, {
          ...nextProjection,
          ...workspaceState,
          pages,
        });
        break;
      }
      case 'pageBoxes': {
        const pageBoxes = await queryPageBoxes(scope.pageId);
        nextProjection = structurallyShare(nextProjection, {
          ...nextProjection,
          boxes: replacePageBoxes(nextProjection.boxes, scope.pageId, pageBoxes),
        });
        break;
      }
      case 'boxItems': {
        const items = await queryBoxItems(scope.boxId);
        nextProjection = structurallyShare(nextProjection, {
          ...nextProjection,
          boxes: nextProjection.boxes.map((box) =>
            box.id === scope.boxId ? { ...box, items } : box,
          ),
        });
        break;
      }
      case 'history':
      case 'preferences':
        // history applied below; preferences handled by preferencesStore
        break;
      default:
        break;
    }
  }

  if (historyTask) {
    const history = await historyTask;
    state = {
      ...state,
      projection: nextProjection,
      historyPast: history.canUndo ? [true] : [],
      historyFuture: history.canRedo ? [true] : [],
    };
  } else {
    state = {
      ...state,
      projection: nextProjection,
    };
  }
  emitChange();
}

function structurallyShare<T>(previous: T, next: T): T {
  return structurallyShareValue(previous, next) as T;
}

function structurallyShareValue(previous: unknown, next: unknown): unknown {
  if (Object.is(previous, next)) return previous;

  if (Array.isArray(previous) && Array.isArray(next)) {
    if (previous.length !== next.length) return next;
    let unchanged = true;
    const shared = next.map((value, index) => {
      const sharedValue = structurallyShareValue(previous[index], value);
      if (!Object.is(sharedValue, previous[index])) unchanged = false;
      return sharedValue;
    });
    return unchanged ? previous : shared;
  }

  if (isPlainRecord(previous) && isPlainRecord(next)) {
    const previousKeys = Object.keys(previous);
    const nextKeys = Object.keys(next);
    if (previousKeys.length !== nextKeys.length) return next;
    let unchanged = true;
    const shared: Record<string, unknown> = {};
    for (const key of nextKeys) {
      if (!(key in previous)) return next;
      const sharedValue = structurallyShareValue(previous[key], next[key]);
      if (!Object.is(sharedValue, previous[key])) unchanged = false;
      shared[key] = sharedValue;
    }
    return unchanged ? previous : shared;
  }

  return next;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function runCommand(command: WorkspaceCommand) {
  return enqueue(async () => {
    // Scopes applied from command.ok inside RuntimeClient (design §6.11.2).
    return await dispatchDatabaseCommand(command);
  });
}

function replacePageBoxes(
  currentBoxes: WorkspaceProjection['boxes'],
  pageId: string,
  pageBoxes: WorkspaceProjection['boxes'],
) {
  const nextPageBoxes = [...pageBoxes];
  const boxes = currentBoxes.flatMap((box) =>
    box.pageId === pageId ? nextPageBoxes.splice(0, 1) : [box],
  );
  return [...boxes, ...nextPageBoxes];
}

function fireCommand(command: WorkspaceCommand) {
  void runCommand(command).catch(reportCommandError);
}

function fireHistoryChange(direction: 'undo' | 'redo') {
  void enqueue(async () => {
    if (direction === 'undo') await undoDatabaseHistory();
    else await redoDatabaseHistory();
    // history.ok scopes applied by RuntimeClient.
  }).catch(reportCommandError);
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = commandQueue.then(task, task);
  commandQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function requireCreatedItem(result: DatabaseCommandResult, commandType: string) {
  const itemId = result.createdItemId;
  const item = itemId
    ? state.projection.boxes
        .flatMap((box) => box.items)
        .find((candidate) => candidate.id === itemId)
    : undefined;
  if (!item) throw new Error(`${commandType} completed without an Item projection.`);
  const box = state.projection.boxes.find((candidate) =>
    candidate.items.some((candidateItem) => candidateItem.id === item.id),
  );
  return { boxId: result.createdBoxId ?? box?.id ?? '', item };
}

function reportCommandError(error: unknown) {
  console.error('Cardo command failed', error);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitChange() {
  for (const listener of listeners) listener();
}

type WorkspaceStoreHook = {
  <T>(selector: (current: WorkspaceStore) => T): T;
  getState(): WorkspaceStore;
  initialize(): Promise<void>;
};

export const useWorkspaceStore = Object.assign(
  function useWorkspaceStoreSelector<T>(selector: (current: WorkspaceStore) => T) {
    return useSyncExternalStore(
      subscribe,
      () => selector(state),
      () => selector(state),
    );
  },
  {
    getState: () => state,
    initialize: refreshProjection,
  },
) as WorkspaceStoreHook;

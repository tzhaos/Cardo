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
  updateBoxFrame: (boxId: string, frame: BoxFrame) =>
    fireCommand({ type: 'box.updateFrame', boxId, frame }),
  updateCollectionBoxFrame: (boxId: string, frame: BoxFrame) =>
    fireCommand({ type: 'collection.updateBoxFrame', boxId, frame }),
  updateCollectionBoxView: (
    boxId: string,
    patch: { viewMode?: WorkspaceBoxViewMode; detailMode?: WorkspaceBoxDetailMode; order?: number },
  ) => fireCommand({ type: 'collection.updateView', boxId, patch }),
  applyPageBoxLayout: (pageId: string, frames: Record<string, BoxFrame>) =>
    fireCommand({ type: 'canvas.arrange', pageId, frames }),
  applyCollectionBoxLayout: (frames: Record<string, BoxFrame>) =>
    fireCommand({ type: 'collection.arrange', frames }),
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
    fireCommand({ type: 'box.moveToPage', boxId, pageId, frame }),
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
    const projectionBeforeCommand = state.projection;
    const result = await dispatchDatabaseCommand(command);
    await refreshAfterCommand(command, projectionBeforeCommand);
    return result;
  });
}

async function refreshAfterCommand(
  command: WorkspaceCommand,
  projectionBeforeCommand: WorkspaceProjection,
) {
  const scope = getCommandRefreshScope(command, projectionBeforeCommand);

  if (scope.type === 'projection') {
    await refreshProjection();
    return;
  }

  const historyTask = queryDatabaseHistoryState();
  let nextProjection = state.projection;

  if (scope.type === 'workspaceState') {
    const workspaceState = await queryWorkspaceState();
    nextProjection = structurallyShare(state.projection, {
      ...state.projection,
      ...workspaceState,
    });
  } else if (scope.type === 'pageTabs') {
    const pages = await queryPageTabs();
    nextProjection = structurallyShare(state.projection, { ...state.projection, pages });
  } else if (scope.type === 'pageTabsAndState') {
    const [pages, workspaceState] = await Promise.all([queryPageTabs(), queryWorkspaceState()]);
    nextProjection = structurallyShare(state.projection, {
      ...state.projection,
      ...workspaceState,
      pages,
    });
  } else if (scope.type === 'pageBoxes') {
    const pageBoxes = await queryPageBoxes(scope.pageId);
    nextProjection = structurallyShare(state.projection, {
      ...state.projection,
      boxes: replacePageBoxes(state.projection.boxes, scope.pageId, pageBoxes),
    });
  } else if (scope.type === 'boxItems') {
    const items = await queryBoxItems(scope.boxId);
    nextProjection = structurallyShare(state.projection, {
      ...state.projection,
      boxes: state.projection.boxes.map((box) =>
        box.id === scope.boxId ? { ...box, items } : box,
      ),
    });
  }

  const history = await historyTask;
  state = {
    ...state,
    projection: nextProjection,
    historyPast: history.canUndo ? [true] : [],
    historyFuture: history.canRedo ? [true] : [],
  };
  emitChange();
}

type CommandRefreshScope =
  | { type: 'projection' }
  | { type: 'workspaceState' }
  | { type: 'pageTabs' }
  | { type: 'pageTabsAndState' }
  | { type: 'pageBoxes'; pageId: string }
  | { type: 'boxItems'; boxId: string }
  | { type: 'historyOnly' };

function getCommandRefreshScope(
  command: WorkspaceCommand,
  projection: WorkspaceProjection,
): CommandRefreshScope {
  switch (command.type) {
    case 'page.open':
    case 'page.setDefault':
      return { type: 'workspaceState' };
    case 'page.create':
      return { type: 'pageTabsAndState' };
    case 'page.rename':
    case 'page.reorder':
      return { type: 'pageTabs' };
    case 'box.create':
      return { type: 'pageBoxes', pageId: command.pageId };
    case 'box.updateFrame':
    case 'box.rename':
    case 'box.promote':
    case 'box.setDetailMode':
    case 'box.setLocked':
    case 'box.setAppearance':
    case 'box.setViewMode':
      return getBoxPageRefreshScope(projection, command.boxId);
    case 'canvas.arrange':
      return { type: 'pageBoxes', pageId: command.pageId };
    case 'item.rename':
    case 'item.editContent':
    case 'item.setPinned':
    case 'item.reorder':
    case 'bookmark.setFavicon':
      return { type: 'boxItems', boxId: command.boxId };
    case 'item.create':
      return getBoxPageRefreshScope(projection, command.boxId);
    case 'preferences.setLocale':
    case 'preferences.setColorMode':
    case 'preferences.setTheme':
    case 'preferences.setSearchEngine':
    case 'preferences.setCustomSearchTemplate':
      return { type: 'historyOnly' };
    case 'workspace.import':
    case 'page.delete':
    case 'item.paste':
    case 'collection.updateBoxFrame':
    case 'collection.updateView':
    case 'collection.arrange':
    case 'box.moveToPage':
    case 'box.collect':
    case 'box.removeFromCollection':
    case 'item.moveBetweenBoxes':
    case 'box.delete':
    case 'item.delete':
    case 'system.constrainFrames':
      return { type: 'projection' };
    default:
      return assertNever(command);
  }
}

function getBoxPageRefreshScope(
  projection: WorkspaceProjection,
  boxId: string,
): CommandRefreshScope {
  const pageId = projection.boxes.find((box) => box.id === boxId)?.pageId;
  return pageId ? { type: 'pageBoxes', pageId } : { type: 'projection' };
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

function assertNever(value: never): never {
  throw new Error(`Unhandled workspace command: ${JSON.stringify(value)}`);
}

function fireCommand(command: WorkspaceCommand) {
  void runCommand(command).catch(reportCommandError);
}

function fireHistoryChange(direction: 'undo' | 'redo') {
  void enqueue(async () => {
    if (direction === 'undo') await undoDatabaseHistory();
    else await redoDatabaseHistory();
    await refreshProjection();
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
  console.error('KhaosBox command failed', error);
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

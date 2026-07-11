import { useSyncExternalStore } from 'react';
import type { WorkspaceCommand } from '../../../core/contracts/workspaceCommands';
import type { DatabaseCommandResult } from '../../../core/application/commandTypes';
import type {
  BoxFrame,
  BoxItem,
  WorkspaceBoxDetailMode,
  WorkspaceBoxIcon,
  WorkspaceBoxPreset,
  WorkspaceBoxViewMode,
  WorkspaceItemType,
  WorkspaceProjection,
} from '../../domain/workspace';
import type { CanvasViewportSize } from '../../domain/canvasGeometry';
import {
  dispatchDatabaseCommand,
  queryDatabaseHistoryState,
  queryWorkspaceProjection,
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
  createBox: (preset: WorkspaceBoxPreset, frame: BoxFrame, title?: string) => void;
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
  activePageId: 'khaosbox-collection',
  defaultPageId: 'khaosbox-collection',
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
  reorderPages: (orderedPageIds: string[]) =>
    fireCommand({ type: 'page.reorder', orderedPageIds }),
  setActivePage: (pageId: string, _origin = 'navigation') =>
    fireCommand({ type: 'page.open', pageId }),
  setDefaultPage: (pageId: string) => fireCommand({ type: 'page.setDefault', pageId }),
  createBox: (preset: WorkspaceBoxPreset, frame: BoxFrame, title?: string) =>
    fireCommand({
      type: 'box.create',
      pageId: state.projection.activePageId,
      preset,
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
  setBoxAppearance: (
    boxId: string,
    appearance: { icon?: WorkspaceBoxIcon; accent?: string },
  ) => fireCommand({ type: 'box.setAppearance', boxId, ...appearance }),
  setBoxPreset: (boxId: string, preset: WorkspaceBoxPreset) =>
    fireCommand({ type: 'box.setPreset', boxId, preset }),
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
  createItem: async (
    boxId: string,
    itemType: WorkspaceItemType,
    draft: Record<string, string>,
  ) => {
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
  const [projection, history] = await Promise.all([
    queryWorkspaceProjection(),
    queryDatabaseHistoryState(),
  ]);
  state = {
    ...state,
    projection,
    historyPast: history.canUndo ? [true] : [],
    historyFuture: history.canRedo ? [true] : [],
  };
  for (const listener of listeners) listener();
}

function runCommand(command: WorkspaceCommand) {
  return enqueue(async () => {
    const result = await dispatchDatabaseCommand(command);
    await refreshProjection();
    return result;
  });
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
    ? state.projection.boxes.flatMap((box) => box.items).find((candidate) => candidate.id === itemId)
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

type WorkspaceStoreHook = {
  <T>(selector: (current: WorkspaceStore) => T): T;
  getState(): WorkspaceStore;
  initialize(): Promise<void>;
};

export const useWorkspaceStore = Object.assign(
  function useWorkspaceStoreSelector<T>(selector: (current: WorkspaceStore) => T) {
    return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
  },
  {
    getState: () => state,
    initialize: refreshProjection,
  },
) as WorkspaceStoreHook;

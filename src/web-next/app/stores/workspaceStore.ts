import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { webNextStorage } from '../../platform/hostPlatform';
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
  addBox,
  addItem,
  addPage,
  deleteBox,
  deleteItem,
  deletePage,
  moveBoxToPage,
  moveItemBetweenBoxes,
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
  updateBoxFrame,
  updateItemContent,
  constrainWorkspaceFramesToViewport,
} from '../../domain/reducers';

interface WorkspaceStore {
  snapshot: WorkspaceSnapshot;
  createPage: (title?: string) => string;
  renamePage: (pageId: string, title: string) => void;
  deletePage: (pageId: string) => void;
  reorderPages: (orderedPageIds: string[]) => void;
  setActivePage: (pageId: string) => void;
  setDefaultPage: (pageId: string) => void;
  createBox: (preset: WorkspaceBoxPreset, frame: BoxFrame, title?: string) => void;
  createTemporaryBox: (pageId: string, frame: BoxFrame) => string;
  updateBoxFrame: (boxId: string, frame: BoxFrame) => void;
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
  reorderItems: (boxId: string, orderedItemIds: string[]) => void;
  deleteItem: (boxId: string, itemId: string) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      snapshot: createDefaultWorkspace(),
      createPage: (title = 'Untitled') => {
        let createdPageId = '';
        set((state) => {
          const nextSnapshot = addPage(state.snapshot, title);
          createdPageId = nextSnapshot.activePageId;
          return { snapshot: nextSnapshot };
        });
        return createdPageId;
      },
      renamePage: (pageId, title) =>
        set((state) => ({ snapshot: renamePage(state.snapshot, pageId, title) })),
      deletePage: (pageId) => set((state) => ({ snapshot: deletePage(state.snapshot, pageId) })),
      reorderPages: (orderedPageIds) =>
        set((state) => ({ snapshot: reorderPages(state.snapshot, orderedPageIds) })),
      setActivePage: (pageId) =>
        set((state) => ({ snapshot: setActivePage(state.snapshot, pageId) })),
      setDefaultPage: (pageId) =>
        set((state) => ({ snapshot: setDefaultPage(state.snapshot, pageId) })),
      createBox: (preset, frame, title) =>
        set((state) => ({
          snapshot: addBox(state.snapshot, state.snapshot.activePageId, preset, frame, title),
        })),
      createTemporaryBox: (pageId, frame) => {
        let createdBoxId = '';
        set((state) => {
          const snapshot = addBox(state.snapshot, pageId, 'general', frame, '', 'temporary');
          createdBoxId = snapshot.boxes.at(-1)?.id ?? '';
          return { snapshot: { ...snapshot, activePageId: pageId } };
        });
        return createdBoxId;
      },
      updateBoxFrame: (boxId, frame) =>
        set((state) => ({ snapshot: updateBoxFrame(state.snapshot, boxId, frame) })),
      constrainFramesToViewport: (viewport) => {
        const snapshot = get().snapshot;
        const nextSnapshot = constrainWorkspaceFramesToViewport(snapshot, viewport);
        if (nextSnapshot !== snapshot) {
          set({ snapshot: nextSnapshot });
        }
      },
      renameBox: (boxId, title) =>
        set((state) => ({ snapshot: renameBox(state.snapshot, boxId, title) })),
      promoteTemporaryBox: (boxId, title) =>
        set((state) => ({ snapshot: promoteTemporaryBox(state.snapshot, boxId, title) })),
      setBoxDetailMode: (boxId, detailMode) =>
        set((state) => ({ snapshot: setBoxDetailMode(state.snapshot, boxId, detailMode) })),
      setBoxLocked: (boxId, isLocked) =>
        set((state) => ({ snapshot: setBoxLocked(state.snapshot, boxId, isLocked) })),
      setBoxAppearance: (boxId, appearance) =>
        set((state) => ({ snapshot: setBoxAppearance(state.snapshot, boxId, appearance) })),
      setBoxPreset: (boxId, preset) =>
        set((state) => ({ snapshot: setBoxPreset(state.snapshot, boxId, preset) })),
      setBoxViewMode: (boxId, viewMode) =>
        set((state) => ({ snapshot: setBoxViewMode(state.snapshot, boxId, viewMode) })),
      moveBoxToPage: (boxId, pageId, frame) =>
        set((state) => ({ snapshot: moveBoxToPage(state.snapshot, boxId, pageId, frame) })),
      moveItemBetweenBoxes: (sourceBoxId, targetBoxId, itemId, targetIndex) =>
        set((state) => ({
          snapshot: moveItemBetweenBoxes(
            state.snapshot,
            sourceBoxId,
            targetBoxId,
            itemId,
            targetIndex,
          ),
        })),
      deleteBox: (boxId) => set((state) => ({ snapshot: deleteBox(state.snapshot, boxId) })),
      createItem: (boxId, type, draft) => {
        const item = createItem(type, draft as never);
        set((state) => ({ snapshot: addItem(state.snapshot, boxId, item) }));
        return item;
      },
      renameItem: (boxId, itemId, title) =>
        set((state) => ({ snapshot: renameItem(state.snapshot, boxId, itemId, title) })),
      updateItemContent: (boxId, itemId, content) =>
        set((state) => ({ snapshot: updateItemContent(state.snapshot, boxId, itemId, content) })),
      setItemPinned: (boxId, itemId, isPinned) =>
        set((state) => ({ snapshot: setItemPinned(state.snapshot, boxId, itemId, isPinned) })),
      reorderItems: (boxId, orderedItemIds) =>
        set((state) => ({ snapshot: reorderItems(state.snapshot, boxId, orderedItemIds) })),
      deleteItem: (boxId, itemId) =>
        set((state) => ({ snapshot: deleteItem(state.snapshot, boxId, itemId) })),
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

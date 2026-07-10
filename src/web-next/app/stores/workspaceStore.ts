import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { webNextStorage } from '../../platform/hostPlatform';
import { createDefaultWorkspace, createItem } from '../../domain/factories';
import { restoreWorkspaceSnapshot } from '../../domain/persistence';
import type {
  BoxFrame,
  BoxItem,
  WorkspaceBoxDetailMode,
  WorkspaceBoxType,
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
  renameBox,
  renameItem,
  renamePage,
  reorderItems,
  reorderPages,
  setActivePage,
  setBoxDetailMode,
  setBoxPinned,
  setBoxViewMode,
  setDefaultPage,
  setItemPinned,
  updateBoxFrame,
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
  createBox: (type: WorkspaceBoxType, frame: BoxFrame, title?: string) => void;
  updateBoxFrame: (boxId: string, frame: BoxFrame) => void;
  constrainFramesToViewport: (viewport: CanvasViewportSize) => void;
  renameBox: (boxId: string, title: string) => void;
  setBoxDetailMode: (boxId: string, detailMode: WorkspaceBoxDetailMode) => void;
  setBoxPinned: (boxId: string, isPinned: boolean) => void;
  setBoxViewMode: (boxId: string, viewMode: WorkspaceBoxViewMode) => void;
  moveBoxToPage: (boxId: string, pageId: string, frame?: BoxFrame) => void;
  deleteBox: (boxId: string) => void;
  createItem: (boxId: string, type: WorkspaceBoxType, draft: Record<string, string>) => BoxItem;
  renameItem: (boxId: string, itemId: string, title: string) => void;
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
      createBox: (type, frame, title) =>
        set((state) => ({
          snapshot: addBox(state.snapshot, state.snapshot.activePageId, type, frame, title),
        })),
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
      setBoxDetailMode: (boxId, detailMode) =>
        set((state) => ({ snapshot: setBoxDetailMode(state.snapshot, boxId, detailMode) })),
      setBoxPinned: (boxId, isPinned) =>
        set((state) => ({ snapshot: setBoxPinned(state.snapshot, boxId, isPinned) })),
      setBoxViewMode: (boxId, viewMode) =>
        set((state) => ({ snapshot: setBoxViewMode(state.snapshot, boxId, viewMode) })),
      moveBoxToPage: (boxId, pageId, frame) =>
        set((state) => ({ snapshot: moveBoxToPage(state.snapshot, boxId, pageId, frame) })),
      deleteBox: (boxId) => set((state) => ({ snapshot: deleteBox(state.snapshot, boxId) })),
      createItem: (boxId, type, draft) => {
        const item = createItem(type, draft as never);
        set((state) => ({ snapshot: addItem(state.snapshot, boxId, item) }));
        return item;
      },
      renameItem: (boxId, itemId, title) =>
        set((state) => ({ snapshot: renameItem(state.snapshot, boxId, itemId, title) })),
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

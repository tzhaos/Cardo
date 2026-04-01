import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BoxData } from '../../../types/box';
import type { BoxItemData } from '../../../types/item';
import { createExtensionJSONStorage } from '../../../extension/storage/createExtensionJSONStorage';
import {
  addItem,
  addPastedItem,
  bringBoxToFront,
  deleteItem,
  createBox,
  deleteBox,
  moveItem,
  replaceBoxes,
  setItemPinned,
  toggleAllBoxesMinimized,
  toggleBoxMinimize,
  updateItem,
  updateBox,
} from '../model/workspaceCommands';
import { createInitialBoxes } from '../model/defaultBoxes';
import { normalizePersistedWorkspaceSnapshot } from '../model/workspaceSchema';
import { createWorkspaceDataState, WORKSPACE_STATE_VERSION } from '../model/workspaceState';

interface WorkspaceState {
  version: number;
  boxesById: Record<string, BoxData>;
  boxOrder: string[];
  maxZIndex: number;
  bringToFront: (id: string) => void;
  updateBox: (id: string, updates: Partial<BoxData>) => void;
  toggleMinimize: (id: string) => void;
  deleteBox: (id: string) => void;
  createBox: (viewport: { width: number; height: number }) => string;
  toggleAllMinimized: () => boolean;
  addPastedItem: (text: string, activeBoxId: string | null) => string | null;
  addItem: (boxId: string, item: BoxItemData) => void;
  updateItem: (boxId: string, itemId: string, updates: Partial<BoxItemData>) => void;
  deleteItem: (boxId: string, itemId: string) => void;
  setItemPinned: (boxId: string, itemId: string, isPinned: boolean) => void;
  moveItem: (
    itemId: string,
    sourceBoxId: string,
    targetBoxId: string,
    targetIndex?: number,
  ) => void;
  replaceBoxes: (boxes: BoxData[]) => void;
  clearBoxes: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      ...createWorkspaceDataState(createInitialBoxes(), WORKSPACE_STATE_VERSION),

      bringToFront: (id) => {
        set(bringBoxToFront(get(), id));
      },

      updateBox: (id, updates) => {
        set(updateBox(get(), id, updates));
      },

      toggleMinimize: (id) => {
        set(toggleBoxMinimize(get(), id));
      },

      deleteBox: (id) => {
        set(deleteBox(get(), id));
      },

      createBox: (viewport) => {
        const nextState = createBox(get(), {
          viewportWidth: viewport.width,
          viewportHeight: viewport.height,
        });

        set(nextState);
        return nextState.createdBox.id;
      },

      toggleAllMinimized: () => {
        const nextState = toggleAllBoxesMinimized(get());

        set(nextState);
        return nextState.areBoxesNowMinimized;
      },

      addPastedItem: (text, activeBoxId) => {
        const nextState = addPastedItem(get(), activeBoxId, text);

        set(nextState);
        return nextState.targetBoxId;
      },

      addItem: (boxId, item) => {
        set(addItem(get(), boxId, item));
      },

      updateItem: (boxId, itemId, updates) => {
        set(updateItem(get(), boxId, itemId, updates));
      },

      deleteItem: (boxId, itemId) => {
        set(deleteItem(get(), boxId, itemId));
      },

      setItemPinned: (boxId, itemId, isPinned) => {
        set(setItemPinned(get(), boxId, itemId, isPinned));
      },

      moveItem: (itemId, sourceBoxId, targetBoxId, targetIndex) => {
        set(moveItem(get(), itemId, sourceBoxId, targetBoxId, targetIndex));
      },

      replaceBoxes: (boxes) => {
        set(replaceBoxes(boxes));
      },

      clearBoxes: () => {
        set({
          version: WORKSPACE_STATE_VERSION,
          boxesById: {},
          boxOrder: [],
          maxZIndex: 0,
        });
      },
    }),
    {
      name: 'khaosbox-workspace',
      storage: createExtensionJSONStorage<WorkspaceState>(),
      partialize: ({ version, boxesById, boxOrder, maxZIndex }) => ({
        version,
        boxesById,
        boxOrder,
        maxZIndex,
      }),
      merge: (persistedState, currentState) => {
        const normalizedState = normalizePersistedWorkspaceSnapshot(persistedState);

        return {
          ...currentState,
          version: normalizedState.version,
          boxesById: normalizedState.boxesById,
          boxOrder: normalizedState.boxOrder,
          maxZIndex: normalizedState.maxZIndex,
        };
      },
    },
  ),
);

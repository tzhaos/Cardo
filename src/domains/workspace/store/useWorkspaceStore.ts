import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BoxData } from '../../../types/box';
import { createPlatformJSONStorage } from '../../../platform/storage/createPlatformStateStorage';
import {
  addPastedItem,
  bringBoxToFront,
  createBox,
  deleteBox,
  moveItem,
  replaceBoxes,
  toggleAllBoxesMinimized,
  toggleBoxMinimize,
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
      storage: createPlatformJSONStorage<WorkspaceState>(),
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

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createInitialWorkspaceSnapshot } from '../../domains/workspace/model/createInitialWorkspaceSnapshot';
import { reduceWorkspace } from '../../domains/workspace/model/reduceWorkspace';
import { parseWorkspaceSnapshot } from '../../domains/workspace/model/workspaceCodec';
import type { WorkspaceCommand, WorkspaceSnapshotV3 } from '../../domains/workspace/model/workspace';
import { workspaceStoragePort } from '../ports/defaultPorts';

interface WorkspaceStoreState {
  snapshot: WorkspaceSnapshotV3;
  dispatch: (command: WorkspaceCommand) => void;
}

export const useWorkspaceStore = create<WorkspaceStoreState>()(
  persist(
    (set) => ({
      snapshot: createInitialWorkspaceSnapshot(),
      dispatch: (command) =>
        set((state) => ({
          snapshot: reduceWorkspace(state.snapshot, command),
        })),
    }),
    {
      name: 'khaosbox-workspace-v3',
      storage: createJSONStorage(() => workspaceStoragePort),
      partialize: ({ snapshot }) => snapshot,
      merge: (persistedState, currentState) => ({
        ...currentState,
        snapshot:
          parseWorkspaceSnapshot(persistedState) ??
          currentState.snapshot,
      }),
    },
  ),
);

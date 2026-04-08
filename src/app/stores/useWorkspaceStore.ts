import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createInitialWorkspaceSnapshot } from '../../domains/workspace/model/createInitialWorkspaceSnapshot';
import { reduceWorkspace } from '../../domains/workspace/model/reduceWorkspace';
import { parseWorkspaceSnapshot } from '../../domains/workspace/model/workspaceCodec';
import type {
  WorkspaceCommand,
  WorkspaceSnapshotV3,
} from '../../domains/workspace/model/workspace';
import { log } from '../../lib/log';
import type { WorkspaceStoragePort } from '../ports/WorkspaceStoragePort';
import { workspaceStoragePort } from '../ports/defaultPorts';

interface WorkspaceStoreState {
  snapshot: WorkspaceSnapshotV3;
  dispatch: (command: WorkspaceCommand) => void;
}

export function createWorkspaceStore(storage: WorkspaceStoragePort) {
  return create<WorkspaceStoreState>()(
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
        version: 1,
        migrate: (persistedState) => persistedState as WorkspaceSnapshotV3,
        storage: createJSONStorage(() => storage),
        partialize: ({ snapshot }) => snapshot,
        merge: (persistedState, currentState) => {
          const parsed = parseWorkspaceSnapshot(persistedState);
          if (parsed === null && persistedState != null && typeof persistedState === 'object') {
            log.warn('Persisted workspace ignored: unsupported or corrupt snapshot shape');
          }
          return {
            ...currentState,
            snapshot: parsed ?? currentState.snapshot,
          };
        },
        onRehydrateStorage: () => (_state, error) => {
          if (error) {
            log.error('Workspace store rehydration failed', error);
          }
        },
      },
    ),
  );
}

export const useWorkspaceStore = createWorkspaceStore(workspaceStoragePort);

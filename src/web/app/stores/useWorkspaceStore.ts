import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  createInitialWorkspaceSnapshot,
  ensureDefaultWorkspacePageBoxes,
} from '../../../core/domains/workspace/model/createInitialWorkspaceSnapshot';
import { reduceWorkspace } from '../../../core/domains/workspace/model/reduceWorkspace';
import { parseWorkspaceSnapshot } from '../../../core/domains/workspace/model/workspaceCodec';
import { getOrderedBoxes } from '../../../core/domains/workspace/model/workspaceSelectors';
import type {
  WorkspaceCommand,
  WorkspaceSnapshot,
} from '../../../core/domains/workspace/model/workspace';
import { log } from '../../../core/log';
import type { WorkspaceStoragePort } from '../../../core/ports/WorkspaceStoragePort';
import { workspaceStoragePort } from '../ports/defaultPorts';

interface WorkspaceStoreState {
  snapshot: WorkspaceSnapshot;
  dispatch: (command: WorkspaceCommand) => void;
}

function resolveRenderableSnapshot(input: unknown, fallback: WorkspaceSnapshot) {
  const parsed = parseWorkspaceSnapshot(input);

  if (!parsed) {
    return null;
  }

  const orderedBoxes = getOrderedBoxes(parsed);

  if (orderedBoxes.length === 0) {
    return fallback;
  }

  const renderableSnapshot = orderedBoxes.some((box) => box.isMinimized)
    ? {
        ...parsed,
        boxViewStatesById: Object.fromEntries(
          Object.entries(parsed.boxViewStatesById).map(([boxId, viewState]) => [
            boxId,
            {
              ...viewState,
              isMinimized: false,
            },
          ]),
        ),
      }
    : parsed;

  return ensureDefaultWorkspacePageBoxes(renderableSnapshot);
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
        migrate: (persistedState) => persistedState as WorkspaceSnapshot,
        storage: createJSONStorage(() => storage),
        partialize: ({ snapshot }) => snapshot,
        merge: (persistedState, currentState) => {
          const parsed = resolveRenderableSnapshot(persistedState, currentState.snapshot);
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

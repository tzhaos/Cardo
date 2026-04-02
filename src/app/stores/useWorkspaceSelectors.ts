import { useShallow } from 'zustand/react/shallow';
import {
  getOrderedBoxes,
  getVisibleBoxes,
  getWorkspaceBox,
} from '../../domains/workspace/model/workspaceSelectors';
import { useWorkspaceStore } from './useWorkspaceStore';

export function useWorkspaceSnapshot() {
  return useWorkspaceStore((state) => state.snapshot);
}

export function useWorkspaceDispatch() {
  return useWorkspaceStore((state) => state.dispatch);
}

export function useVisibleBoxes() {
  return useWorkspaceStore(useShallow((state) => getVisibleBoxes(state.snapshot)));
}

export function useWorkspaceBox(boxId: string) {
  return useWorkspaceStore((state) => getWorkspaceBox(state.snapshot, boxId));
}

export function useTrayBoxes() {
  return useWorkspaceStore(useShallow((state) => getOrderedBoxes(state.snapshot)));
}

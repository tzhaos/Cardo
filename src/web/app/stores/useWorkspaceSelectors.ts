import { useMemo } from 'react';
import {
  getBoxItems,
  getOrderedBoxes,
  getVisibleBoxes,
  getWorkspaceBox,
} from '../../../core/domains/workspace/model/workspaceSelectors';
import { useWorkspaceStore } from './useWorkspaceStore';

export function useWorkspaceSnapshot() {
  return useWorkspaceStore((state) => state.snapshot);
}

export function useWorkspaceDispatch() {
  return useWorkspaceStore((state) => state.dispatch);
}

export function useVisibleBoxes() {
  const snapshot = useWorkspaceSnapshot();
  return useMemo(() => getVisibleBoxes(snapshot), [snapshot]);
}

export function useWorkspaceBox(boxId: string) {
  const snapshot = useWorkspaceSnapshot();
  return useMemo(() => getWorkspaceBox(snapshot, boxId), [boxId, snapshot]);
}

export function useWorkspaceBoxItems(boxId: string) {
  const snapshot = useWorkspaceSnapshot();
  return useMemo(() => getBoxItems(snapshot, boxId), [boxId, snapshot]);
}

export function useTrayBoxes() {
  const snapshot = useWorkspaceSnapshot();
  return useMemo(() => getOrderedBoxes(snapshot), [snapshot]);
}

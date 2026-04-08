import { useWorkspaceStore } from '../stores/useWorkspaceStore';

export function moveItemToBox(
  itemId: string,
  sourceBoxId: string,
  targetBoxId: string,
  targetIndex?: number,
) {
  useWorkspaceStore.getState().dispatch({
    type: 'item.move',
    itemId,
    sourceBoxId,
    targetBoxId,
    ...(targetIndex !== undefined ? { targetIndex } : {}),
  });
}

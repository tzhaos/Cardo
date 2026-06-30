import { createMoveItemCommand } from '../../../core/services/workspaceActions';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';

export function moveItemToBox(
  itemId: string,
  sourceBoxId: string,
  targetBoxId: string,
  targetIndex?: number,
  targetColumnId?: string,
) {
  useWorkspaceStore
    .getState()
    .dispatch(createMoveItemCommand(itemId, sourceBoxId, targetBoxId, targetIndex, targetColumnId));
}

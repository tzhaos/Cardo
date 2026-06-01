import type { ItemDraft } from '../../../core/domains/items/model/item';
import { createAddItemCommand } from '../../../core/services/workspaceActions';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { createId } from './createId';

export function addItemDraftToBox(boxId: string, draft: ItemDraft) {
  const { item, command } = createAddItemCommand(boxId, draft, createId);

  useWorkspaceStore.getState().dispatch(command);

  return item;
}

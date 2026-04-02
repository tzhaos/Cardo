import { createWorkspaceItem, type ItemDraft } from '../../domains/items/model/item';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { createId } from './createId';

export function addItemDraftToBox(boxId: string, draft: ItemDraft) {
  const item = createWorkspaceItem(createId('item'), draft);

  useWorkspaceStore.getState().dispatch({
    type: 'item.add',
    boxId,
    item,
  });

  return item;
}

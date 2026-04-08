import { createWorkspaceItem } from '../../domains/items/model/item';
import { parseTextToItemDraft } from '../../domains/items/services/parseTextToItemDraft';
import { findBoxByRole, getOrderedBoxes } from '../../domains/workspace/model/workspaceSelectors';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { createId } from './createId';

export function pasteTextItem(text: string, activeBoxId: string | null) {
  const { snapshot, dispatch } = useWorkspaceStore.getState();
  const draft = parseTextToItemDraft(text);
  const targetRole =
    draft.type === 'url'
      ? 'links'
      : draft.type === 'file' || draft.type === 'folder'
        ? 'folders'
        : 'notes';

  const targetBox =
    (activeBoxId ? (snapshot.boxesById[activeBoxId] ?? null) : null) ??
    findBoxByRole(snapshot, targetRole) ??
    getOrderedBoxes(snapshot)[0] ??
    null;

  if (!targetBox) {
    return null;
  }

  const item = createWorkspaceItem(createId('item'), draft);

  dispatch({
    type: 'item.add',
    boxId: targetBox.id,
    item,
  });

  return {
    boxId: targetBox.id,
    item,
  };
}

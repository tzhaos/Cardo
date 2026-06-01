import { createPasteTextCommand } from '../../../core/services/workspaceActions';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { createId } from './createId';

export function pasteTextItem(text: string, activeBoxId: string | null) {
  const { snapshot, dispatch } = useWorkspaceStore.getState();
  const result = createPasteTextCommand(snapshot, text, activeBoxId, createId);

  if (!result) {
    return null;
  }

  dispatch(result.command);

  return {
    boxId: result.boxId,
    item: result.item,
  };
}

import { useCallback } from 'react';
import { useInlineRename } from '../../app/useInlineRename';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';

export function useItemRename(boxId: string, itemId: string, title: string) {
  const renameItem = useWorkspaceStore((state) => state.renameItem);
  const deleteItem = useWorkspaceStore((state) => state.deleteItem);
  const setItemPinned = useWorkspaceStore((state) => state.setItemPinned);
  const commitRename = useCallback(
    (draft: string) => renameItem(boxId, itemId, draft),
    [boxId, itemId, renameItem],
  );
  const rename = useInlineRename({ value: title, onCommit: commitRename, allowEmpty: true });

  return {
    ...rename,
    startRenaming: rename.start,
    deleteItem: () => deleteItem(boxId, itemId),
    setPinned: (isPinned: boolean) => setItemPinned(boxId, itemId, isPinned),
  };
}

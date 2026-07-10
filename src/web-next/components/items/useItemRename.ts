import { useEffect, useRef, useState } from 'react';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';

export function useItemRename(boxId: string, itemId: string, title: string) {
  const renameItem = useWorkspaceStore((state) => state.renameItem);
  const deleteItem = useWorkspaceStore((state) => state.deleteItem);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelNextBlur = useRef(false);

  useEffect(() => {
    if (!renaming) setDraft(title);
  }, [renaming, title]);

  useEffect(() => {
    if (renaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [renaming]);

  const startRenaming = () => {
    cancelNextBlur.current = false;
    setDraft(title);
    setRenaming(true);
  };

  const commit = () => {
    if (cancelNextBlur.current) {
      cancelNextBlur.current = false;
      return;
    }
    renameItem(boxId, itemId, draft);
    setRenaming(false);
  };

  const cancel = () => {
    cancelNextBlur.current = true;
    setDraft(title);
    setRenaming(false);
  };

  return {
    renaming,
    draft,
    inputRef,
    setDraft,
    startRenaming,
    commit,
    cancel,
    deleteItem: () => deleteItem(boxId, itemId),
  };
}

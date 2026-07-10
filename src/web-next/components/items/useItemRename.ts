import { useCallback, useEffect, useRef, useState } from 'react';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';

export function useItemRename(boxId: string, itemId: string, title: string) {
  const renameItem = useWorkspaceStore((state) => state.renameItem);
  const deleteItem = useWorkspaceStore((state) => state.deleteItem);
  const setItemPinned = useWorkspaceStore((state) => state.setItemPinned);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);
  const renameFinishedRef = useRef(false);

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
    renameFinishedRef.current = false;
    setDraft(title);
    setRenaming(true);
  };

  const commit = useCallback(() => {
    if (renameFinishedRef.current) {
      return;
    }
    renameFinishedRef.current = true;
    renameItem(boxId, itemId, draft);
    setRenaming(false);
  }, [boxId, draft, itemId, renameItem]);

  const cancel = () => {
    renameFinishedRef.current = true;
    setDraft(title);
    setRenaming(false);
  };

  useEffect(() => {
    if (!renaming) return;

    const commitOnOutsidePointer = (event: PointerEvent) => {
      const input = inputRef.current;
      const target = event.target;
      if (!input || !(target instanceof Node) || input.contains(target)) {
        return;
      }
      commit();
    };

    window.addEventListener('pointerdown', commitOnOutsidePointer, true);
    return () => window.removeEventListener('pointerdown', commitOnOutsidePointer, true);
  }, [commit, renaming]);

  return {
    renaming,
    draft,
    inputRef,
    setDraft,
    startRenaming,
    commit,
    cancel,
    deleteItem: () => deleteItem(boxId, itemId),
    setPinned: (isPinned: boolean) => setItemPinned(boxId, itemId, isPinned),
  };
}

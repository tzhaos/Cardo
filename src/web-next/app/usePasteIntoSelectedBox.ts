import { useEffect } from 'react';
import { createPasteItemDraft } from '../domain/paste';
import { useUiStore } from './stores/uiStore';
import { useWorkspaceStore } from './stores/workspaceStore';

export function usePasteIntoSelectedBox() {
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const state = useUiStore.getState();
      const selectedBoxId = state.selectedBoxId;
      if (!selectedBoxId) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target?.closest('input,textarea,[contenteditable="true"]')) {
        return;
      }

      const text = event.clipboardData?.getData('text/plain') ?? '';
      const box = useWorkspaceStore
        .getState()
        .snapshot.boxes.find((candidate) => candidate.id === selectedBoxId);
      if (!box) {
        return;
      }

      const pasteItem = createPasteItemDraft(text);
      if (!pasteItem) {
        return;
      }

      event.preventDefault();
      const item = useWorkspaceStore.getState().createItem(box.id, pasteItem.type, pasteItem.draft);
      useUiStore.getState().markCreated(box.id, item.id);
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);
}

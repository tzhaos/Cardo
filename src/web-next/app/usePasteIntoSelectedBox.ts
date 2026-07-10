import { useEffect } from 'react';
import { createPasteDraftForBox } from '../domain/paste';
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

      const draft = createPasteDraftForBox(box, text);
      if (!draft) {
        return;
      }

      event.preventDefault();
      const item = useWorkspaceStore.getState().createItem(box.id, box.type, draft);
      useUiStore.getState().markCreated(box.id, item.id);
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);
}

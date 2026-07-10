import { useEffect } from 'react';
import { createCanvasWorldBounds, getCanvasViewportCenter } from '../domain/canvasGeometry';
import { createPasteItemDraft } from '../domain/paste';
import { findNewBoxFrame } from '../domain/placement';
import { isRecycleBinPageId } from '../domain/workspace';
import { useCanvasStore } from './stores/canvasStore';
import { useUiStore } from './stores/uiStore';
import { useWorkspaceStore } from './stores/workspaceStore';

export function usePasteIntoSelectedBox() {
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input,textarea,[contenteditable="true"]')) {
        return;
      }

      const pasteItem = createPasteItemDraft(event.clipboardData?.getData('text/plain') ?? '');
      if (!pasteItem) return;

      event.preventDefault();
      const selectedBoxId = useUiStore.getState().selectedBoxId;
      const workspaceStore = useWorkspaceStore.getState();
      const snapshot = workspaceStore.snapshot;
      let targetBox = selectedBoxId
        ? snapshot.boxes.find((candidate) => candidate.id === selectedBoxId)
        : undefined;

      if (!targetBox) {
        const pageId = isRecycleBinPageId(snapshot.activePageId)
          ? snapshot.defaultPageId
          : snapshot.activePageId;
        targetBox = snapshot.boxes.find(
          (candidate) => candidate.pageId === pageId && candidate.kind === 'temporary',
        );

        if (!targetBox) {
          const canvas = useCanvasStore.getState();
          const camera = canvas.pages[pageId]?.camera ?? { panX: 0, panY: 0, zoom: 1 };
          const bounds = createCanvasWorldBounds(canvas.viewportSize);
          const center = getCanvasViewportCenter(camera, canvas.viewportSize);
          const frame = findNewBoxFrame(snapshot, pageId, center, bounds);
          const boxId = workspaceStore.createTemporaryBox(pageId, frame);
          targetBox = useWorkspaceStore
            .getState()
            .snapshot.boxes.find((candidate) => candidate.id === boxId);
        }
      }

      if (!targetBox) return;

      const item = useWorkspaceStore
        .getState()
        .createItem(targetBox.id, pasteItem.type, pasteItem.draft);
      useUiStore.getState().selectBox(targetBox.id);
      useUiStore.getState().markCreated(targetBox.id, item.id);
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);
}

import { useEffect } from 'react';
import { createCanvasWorldBounds, getCanvasViewportCenter } from '../domain/canvasGeometry';
import { createPasteItemDraft } from '../domain/paste';
import { findNewBoxFrame } from '../domain/placement';
import { isSystemPageId } from '../domain/workspace';
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
      const pageId = isSystemPageId(snapshot.activePageId)
        ? [...snapshot.pages]
            .filter((page) => !isSystemPageId(page.id))
            .sort((first, second) => first.order - second.order)[0]?.id
        : snapshot.activePageId;
      if (!pageId) return;
      let targetBox =
        selectedBoxId && !isSystemPageId(snapshot.activePageId)
          ? snapshot.boxes.find((candidate) => candidate.id === selectedBoxId)
          : undefined;
      if (targetBox?.pageId !== pageId) targetBox = undefined;

      if (!targetBox) {
        targetBox = snapshot.boxes.find(
          (candidate) => candidate.pageId === pageId && candidate.kind === 'temporary',
        );
      }

      const canvas = useCanvasStore.getState();
      const camera = canvas.pages[pageId]?.camera ?? { panX: 0, panY: 0, zoom: 1 };
      const bounds = createCanvasWorldBounds(canvas.viewportSize);
      const center = getCanvasViewportCenter(camera, canvas.viewportSize);
      const temporaryFrame = targetBox?.frame ?? findNewBoxFrame(snapshot, pageId, center, bounds);
      void workspaceStore
        .pasteItem(
          pageId,
          targetBox?.id ?? null,
          temporaryFrame,
          pasteItem.type,
          pasteItem.draft,
        )
        .then((result) => {
          if (!result.boxId) return;
          useUiStore.getState().selectBox(result.boxId);
          useUiStore.getState().markCreated(result.boxId, result.item.id);
        })
        .catch((error: unknown) => console.error('Failed to paste Item', error));
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);
}

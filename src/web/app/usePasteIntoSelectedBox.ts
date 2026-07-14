import { useEffect } from 'react';
import { createCanvasWorldBounds, getCanvasViewportCenter } from '../domain/canvasGeometry';
import { createPasteItemDraft } from '../domain/paste';
import { findNewBoxFrame } from '../domain/placement';
import { isSystemPageId } from '../domain/workspace';
import { translateWebNext } from '../i18n/messages';
import { useCanvasStore } from './stores/canvasStore';
import { usePreferencesStore } from './stores/preferencesStore';
import { showToast } from './stores/toastStore';
import { useUiStore } from './stores/uiStore';
import { useWorkspaceStore } from './stores/workspaceStore';

export function usePasteIntoSelectedBox() {
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input,textarea,[contenteditable="true"]')) {
        return;
      }

      const ui = useUiStore.getState();
      if (ui.draggedBoxId || ui.boxResizeActive) return;

      const pasteItem = createPasteItemDraft(event.clipboardData?.getData('text/plain') ?? '');
      if (!pasteItem) return;

      event.preventDefault();
      const selectedBoxId = ui.selectedBoxId;
      const workspaceStore = useWorkspaceStore.getState();
      const projection = workspaceStore.projection;
      const fromSystemPage = isSystemPageId(projection.activePageId);
      const pageId = fromSystemPage
        ? [...projection.pages]
            .filter((page) => !isSystemPageId(page.id))
            .sort((first, second) => first.order - second.order)[0]?.id
        : projection.activePageId;
      if (!pageId) return;
      let targetBox =
        selectedBoxId && !fromSystemPage
          ? projection.boxes.find((candidate) => candidate.id === selectedBoxId)
          : undefined;
      if (targetBox?.pageId !== pageId) targetBox = undefined;

      if (!targetBox) {
        targetBox = projection.boxes.find(
          (candidate) => candidate.pageId === pageId && candidate.kind === 'temporary',
        );
      }

      const canvas = useCanvasStore.getState();
      const camera = canvas.pages[pageId]?.camera ?? { panX: 0, panY: 0, zoom: 1 };
      const bounds = createCanvasWorldBounds(canvas.viewportSize);
      const center = getCanvasViewportCenter(camera, canvas.viewportSize);
      const temporaryFrame =
        targetBox?.frame ?? findNewBoxFrame(projection, pageId, center, bounds);
      const locale = usePreferencesStore.getState().locale;
      const groupTitle =
        projection.pages.find((page) => page.id === pageId)?.title?.trim() ||
        translateWebNext(locale, 'page.untitled');
      void workspaceStore
        .pasteItem(pageId, targetBox?.id ?? null, temporaryFrame, pasteItem.type, pasteItem.draft)
        .then((result) => {
          if (!result.boxId) return;
          useUiStore.getState().selectBox(result.boxId);
          useUiStore.getState().markCreated(result.boxId, result.item.id);
          if (fromSystemPage) {
            showToast(
              translateWebNext(usePreferencesStore.getState().locale, 'toast.pastedToGroup', {
                title: groupTitle,
              }),
              'info',
            );
          }
        })
        .catch((error: unknown) => {
          console.error('Failed to paste Item', error);
          showToast(
            translateWebNext(usePreferencesStore.getState().locale, 'toast.commandFailed'),
            'error',
          );
        });
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);
}

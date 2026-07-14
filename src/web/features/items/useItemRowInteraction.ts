import type { KeyboardEvent, MouseEvent } from 'react';
import { useUiStore } from '../../app/stores/uiStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';

/**
 * Shared row keyboard + multi-select click handling for item rows.
 * Modifier clicks never fire the primary action; Enter/Space always can.
 */
export function useItemRowInteraction({
  boxId,
  itemId,
  primaryAction,
  openContextMenuAt,
  blocked = false,
}: {
  boxId: string;
  itemId: string;
  primaryAction: () => void;
  openContextMenuAt: (x: number, y: number) => void;
  blocked?: boolean;
}) {
  const selected = useUiStore(
    (state) => state.selectionBoxId === boxId && Boolean(state.selectedItemIds[itemId]),
  );

  const isInteractiveTarget = (target: EventTarget | null) =>
    target instanceof Element &&
    Boolean(
      target.closest(
        'button,a,input,textarea,form,.cardo-item-drag-handle,.cardo-item-glyph,.cardo-item-actions,[data-slot="dropdown-menu-content"]',
      ),
    );

  /** Returns true when the click was consumed by selection (caller should skip primary). */
  const handleSelectionClick = (event: MouseEvent<HTMLElement>): boolean => {
    if (blocked || isInteractiveTarget(event.target)) return true;

    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      event.stopPropagation();
      useUiStore.getState().toggleItemSelection(boxId, itemId);
      return true;
    }

    if (event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      const orderedIds =
        useWorkspaceStore
          .getState()
          .projection.boxes.find((box) => box.id === boxId)
          ?.items.map((item) => item.id) ?? [];
      useUiStore.getState().selectItemRange(boxId, itemId, orderedIds);
      return true;
    }

    const ui = useUiStore.getState();
    const count = ui.selectionBoxId === boxId ? Object.keys(ui.selectedItemIds).length : 0;
    if (count >= 2) {
      event.preventDefault();
      ui.clearItemSelection();
      return true;
    }
    if (count === 1) {
      ui.clearItemSelection();
    }
    return false;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (blocked) return;
    // Nested focusable controls keep their own keys.
    if (event.target instanceof HTMLElement && event.target !== event.currentTarget) {
      const tag = event.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'A') return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      primaryAction();
      return;
    }

    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      openContextMenuAt(rect.left + 12, rect.top + 12);
    }
  };

  return {
    selected,
    handleSelectionClick,
    onKeyDown,
  };
}

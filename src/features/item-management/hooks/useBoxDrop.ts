import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useI18n } from '../../../app/hooks/useI18n';
import { addItemDraftToBox } from '../../../app/use-cases/addItemDraftToBox';
import { useInteractionStore } from '../../../app/stores/useInteractionStore';
import { useWorkspaceDispatch } from '../../../app/stores/useWorkspaceSelectors';
import { ITEM_TYPE_LABEL_KEYS } from '../../../domains/i18n/model/messages';
import { isFormControlElement } from '../../../lib/dom';
import type { ItemDraft, ItemType } from '../../../domains/items/model/item';
import type { WorkspaceBox } from '../../../domains/workspace/model/workspace';
import { createExternalDraftFromTransfer } from '../services/createExternalDraftFromTransfer';
import { createTextItemFromTransfer } from '../services/createExternalItemsFromTransfer';
import { parseDraggedBoxItem } from '../services/parseDraggedBoxItem';

interface DropIndicator {
  id: string;
  position: 'before' | 'after';
}

interface UseBoxDropOptions {
  box: WorkspaceBox;
  onOpenExternalDraft: (draft: ItemDraft) => void;
}

export function useBoxDrop({ box, onOpenExternalDraft }: UseBoxDropOptions) {
  const { t } = useI18n();
  const draggedItemInfo = useInteractionStore((state) => state.draggedItemInfo);
  const editingSessionId = useInteractionStore((state) => state.editingSessionId);
  const setDraggedItemInfo = useInteractionStore((state) => state.setDraggedItemInfo);
  const dispatch = useWorkspaceDispatch();

  const [isDragOver, setIsDragOver] = useState(false);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
  const dragCounter = useRef(0);

  useEffect(() => {
    if (draggedItemInfo && !editingSessionId) {
      return;
    }

    dragCounter.current = 0;
    setIsDragOver(false);
    setDropIndicator(null);
  }, [draggedItemInfo, editingSessionId]);

  const clearDropState = () => {
    dragCounter.current = 0;
    setIsDragOver(false);
    setDropIndicator(null);
  };

  const handleContainerDragEnter = (event: React.DragEvent) => {
    if (editingSessionId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    dragCounter.current += 1;

    if (draggedItemInfo?.sourceBoxId !== box.id) {
      setIsDragOver(true);
    }
  };

  const handleContainerDragLeave = (event: React.DragEvent) => {
    if (editingSessionId) {
      clearDropState();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    dragCounter.current -= 1;

    if (dragCounter.current <= 0) {
      clearDropState();
    }
  };

  const handleContainerDragOver = (event: React.DragEvent) => {
    if (editingSessionId) {
      clearDropState();
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.target === event.currentTarget) {
      setDropIndicator(null);
    }

    if (draggedItemInfo) {
      event.dataTransfer.dropEffect = 'move';

      if (draggedItemInfo.sourceBoxId !== box.id) {
        setIsDragOver(true);
      }

      return;
    }

    if (
      event.dataTransfer.types.includes('application/json') ||
      event.dataTransfer.types.includes('text/plain') ||
      event.dataTransfer.types.includes('text/uri-list')
    ) {
      event.dataTransfer.dropEffect = event.dataTransfer.types.includes('application/json')
        ? 'move'
        : 'copy';
      setIsDragOver(true);
    }
  };

  const handleContainerDrop = (event: React.DragEvent) => {
    if (editingSessionId) {
      clearDropState();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    clearDropState();

    if (event.dataTransfer.types.includes('Files')) {
      const externalDraft = createExternalDraftFromTransfer(event.dataTransfer);

      if (externalDraft) {
        onOpenExternalDraft(externalDraft);
      }

      return;
    }

    const parsedDragPayload = parseDraggedBoxItem(event.dataTransfer);

    if (parsedDragPayload) {
      dispatch({
        type: 'item.move',
        itemId: parsedDragPayload.itemId,
        sourceBoxId: parsedDragPayload.sourceBoxId,
        targetBoxId: box.id,
      });
      setDraggedItemInfo(null);
      return;
    }

    if (draggedItemInfo) {
      dispatch({
        type: 'item.move',
        itemId: draggedItemInfo.itemId,
        sourceBoxId: draggedItemInfo.sourceBoxId,
        targetBoxId: box.id,
      });
      setDraggedItemInfo(null);
      return;
    }

    const textItem = createTextItemFromTransfer(event.dataTransfer);

    if (textItem) {
      addItemDraftToBox(box.id, textItem);
      toast.success(
        t('toast.addedType', {
          type: textItem.type === 'url' ? t('workspace.pastedUrl') : t(ITEM_TYPE_LABEL_KEYS[textItem.type]),
        }),
      );
    }
  };

  const handleItemDragStart = (event: React.DragEvent, itemId: string) => {
    if (editingSessionId || isFormControlElement(event.target)) {
      event.preventDefault();
      return;
    }

    dispatch({ type: 'box.bringToFront', boxId: box.id });
    setDraggedItemInfo({ itemId, sourceBoxId: box.id });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', itemId);
    event.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        type: 'box-item',
        itemId,
        sourceBoxId: box.id,
      }),
    );
  };

  const handleItemDragOver = (event: React.DragEvent, itemId: string) => {
    if (editingSessionId) {
      setDropIndicator(null);
      return;
    }

    event.preventDefault();

    const parsedDragPayload = parseDraggedBoxItem(event.dataTransfer);
    const sourceBoxId = draggedItemInfo?.sourceBoxId || parsedDragPayload?.sourceBoxId;
    const draggedItemId = draggedItemInfo?.itemId || parsedDragPayload?.itemId;

    if (!sourceBoxId || !draggedItemId) {
      setDropIndicator(null);
      return;
    }

    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';

    if (draggedItemId === itemId) {
      setDropIndicator(null);
      return;
    }

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const isAfter =
      box.layout === 'grid'
        ? event.clientX > rect.left + rect.width / 2
        : event.clientY > rect.top + rect.height / 2;

    setDropIndicator({
      id: itemId,
      position: isAfter ? 'after' : 'before',
    });
  };

  const handleItemDrop = (event: React.DragEvent, itemId: string) => {
    if (editingSessionId) {
      setDropIndicator(null);
      return;
    }

    event.preventDefault();

    const parsedDragPayload = parseDraggedBoxItem(event.dataTransfer);
    const activeDrag = parsedDragPayload || draggedItemInfo;

    if (!activeDrag) {
      setDropIndicator(null);
      return;
    }

    event.stopPropagation();
    clearDropState();

    let targetIndex = box.items.findIndex((item) => item.id === itemId);

    if (dropIndicator?.position === 'after') {
      targetIndex += 1;
    }

    dispatch({
      type: 'item.move',
      itemId: activeDrag.itemId,
      sourceBoxId: activeDrag.sourceBoxId,
      targetBoxId: box.id,
      targetIndex,
    });
    setDraggedItemInfo(null);
  };

  return {
    isDragOver,
    dropIndicator,
    handleContainerDragEnter,
    handleContainerDragLeave,
    handleContainerDragOver,
    handleContainerDrop,
    handleItemDragStart,
    handleItemDragOver,
    handleItemDrop,
    handleItemDragEnd: () => {
      setDraggedItemInfo(null);
      setDropIndicator(null);
    },
    bringBoxToFront: () => dispatch({ type: 'box.bringToFront', boxId: box.id }),
  };
}

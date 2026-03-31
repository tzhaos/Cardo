import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useI18n } from '../../../domains/i18n/hooks/useI18n';
import { useUIStore } from '../../../domains/ui/store/useUIStore';
import { useWorkspaceStore } from '../../../domains/workspace/store/useWorkspaceStore';
import { isFormControlElement } from '../../../lib/dom';
import type { BoxData } from '../../../types/box';
import type { ItemType } from '../../../types/item';
import { createExternalDraftFromTransfer } from '../services/createExternalDraftFromTransfer';
import { createTextItemFromTransfer } from '../services/createExternalItemsFromTransfer';
import { parseDraggedBoxItem } from '../services/parseDraggedBoxItem';

interface DropIndicator {
  id: string;
  position: 'before' | 'after';
}

interface UseBoxDropOptions {
  box: BoxData;
  onUpdate: (updates: Partial<BoxData>) => void;
  onOpenExternalDraft: (type: Extract<ItemType, 'file' | 'folder'>, title: string) => void;
}

export function useBoxDrop({ box, onUpdate, onOpenExternalDraft }: UseBoxDropOptions) {
  const { t } = useI18n();
  const draggedItemInfo = useUIStore((state) => state.draggedItemInfo);
  const editingSessionId = useUIStore((state) => state.editingSessionId);
  const setDraggedItemInfo = useUIStore((state) => state.setDraggedItemInfo);
  const moveItem = useWorkspaceStore((state) => state.moveItem);
  const bringToFront = useWorkspaceStore((state) => state.bringToFront);

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
        onOpenExternalDraft(externalDraft.type, externalDraft.title);
      }

      return;
    }

    const parsedDragPayload = parseDraggedBoxItem(event.dataTransfer);

    if (parsedDragPayload) {
      moveItem(parsedDragPayload.itemId, parsedDragPayload.sourceBoxId, box.id);
      setDraggedItemInfo(null);
      return;
    }

    if (draggedItemInfo) {
      moveItem(draggedItemInfo.itemId, draggedItemInfo.sourceBoxId, box.id);
      setDraggedItemInfo(null);
      return;
    }

    const textItem = createTextItemFromTransfer(event.dataTransfer);

    if (textItem) {
      onUpdate({ items: [...box.items, textItem] });
      toast.success(
        t('toast.addedType', {
          type: textItem.type === 'url' ? t('workspace.pastedUrl') : t('itemType.note'),
        }),
      );
    }
  };

  const handleItemDragStart = (event: React.DragEvent, itemId: string) => {
    if (editingSessionId || isFormControlElement(event.target)) {
      event.preventDefault();
      return;
    }

    bringToFront(box.id);
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

    moveItem(activeDrag.itemId, activeDrag.sourceBoxId, box.id, targetIndex);
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
    bringBoxToFront: () => bringToFront(box.id),
  };
}

import { useMemo, useState, type DragEvent } from 'react';
import { createDefaultTemplateState } from '../../../../core/domains/workspace/model/boxTemplates';
import {
  MAX_KANBAN_COLUMNS,
  type KanbanColumn,
  type WorkspaceBox,
} from '../../../../core/domains/workspace/model/workspace';
import type {
  ItemDraft,
  PlacedWorkspaceItem,
  WorkspaceItem,
  WorkspaceItemUpdate,
} from '../../../../core/domains/items/model/item';
import { useInteractionStore } from '../../../app/stores/useInteractionStore';
import {
  useWorkspaceBoxItems,
  useWorkspaceDispatch,
} from '../../../app/stores/useWorkspaceSelectors';
import { addItemDraftToBox } from '../../../app/use-cases/addItemDraftToBox';
import { createId } from '../../../app/use-cases/createId';
import { moveItemToBox } from '../../../app/use-cases/moveItemToBox';
import { useI18n } from '../../../app/hooks/useI18n';
import { isFormControlElement } from '../../../lib/dom';
import { createTextItemFromTransfer } from '../services/createExternalItemsFromTransfer';
import { parseDraggedBoxItem } from '../services/parseDraggedBoxItem';

interface KanbanDropIndicator {
  columnId: string;
  itemId: string;
  position: 'before' | 'after';
}

function getKanbanColumns(box: WorkspaceBox) {
  const columns = box.templateState.kanbanColumns;
  return columns && columns.length > 0
    ? columns
    : (createDefaultTemplateState(box.templateId).kanbanColumns ?? []);
}

function groupItemsByColumn(items: PlacedWorkspaceItem[], columns: KanbanColumn[]) {
  const fallbackColumnId = columns[0]?.id ?? 'todo';
  const columnIds = new Set(columns.map((column) => column.id));
  const groups = new Map(columns.map((column) => [column.id, [] as PlacedWorkspaceItem[]]));

  for (const item of items) {
    const columnId =
      item.columnId && columnIds.has(item.columnId) ? item.columnId : fallbackColumnId;
    const group = groups.get(columnId);

    if (group) {
      group.push(item);
    }
  }

  return groups;
}

export function useManagedKanbanContent(box: WorkspaceBox) {
  const { t } = useI18n();
  const dispatch = useWorkspaceDispatch();
  const items = useWorkspaceBoxItems(box.id);
  const draggedItemInfo = useInteractionStore((state) => state.draggedItemInfo);
  const editingSessionId = useInteractionStore((state) => state.editingSessionId);
  const setDraggedItemInfo = useInteractionStore((state) => state.setDraggedItemInfo);
  const [dropColumnId, setDropColumnId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<KanbanDropIndicator | null>(null);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [draftColumnTitle, setDraftColumnTitle] = useState('');
  const columns = getKanbanColumns(box);
  const groupedItems = useMemo(() => groupItemsByColumn(items, columns), [columns, items]);

  const clearDropState = () => {
    setDropColumnId(null);
    setDropIndicator(null);
  };

  const getActiveDrag = (event: DragEvent) =>
    parseDraggedBoxItem(event.dataTransfer) || draggedItemInfo;

  const handleCardDragStart = (event: DragEvent, itemId: string) => {
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

  const handleCardDragOver = (event: DragEvent, itemId: string, columnId: string) => {
    if (editingSessionId) {
      setDropIndicator(null);
      return;
    }

    event.preventDefault();

    const activeDrag = getActiveDrag(event);

    if (!activeDrag || activeDrag.itemId === itemId) {
      setDropIndicator(null);
      return;
    }

    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();

    setDropColumnId(columnId);
    setDropIndicator({
      columnId,
      itemId,
      position: event.clientY > rect.top + rect.height / 2 ? 'after' : 'before',
    });
  };

  const handleCardDrop = (event: DragEvent, itemId: string, columnId: string) => {
    if (editingSessionId) {
      setDropIndicator(null);
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const activeDrag = getActiveDrag(event);

    if (!activeDrag) {
      clearDropState();
      return;
    }

    let targetIndex = items.findIndex((item) => item.id === itemId);

    if (dropIndicator?.position === 'after') {
      targetIndex += 1;
    }

    moveItemToBox(activeDrag.itemId, activeDrag.sourceBoxId, box.id, targetIndex, columnId);
    setDraggedItemInfo(null);
    clearDropState();
  };

  const handleColumnDrop = (event: DragEvent, columnId: string) => {
    event.preventDefault();
    event.stopPropagation();
    clearDropState();

    const activeDrag = getActiveDrag(event);

    if (activeDrag) {
      moveItemToBox(activeDrag.itemId, activeDrag.sourceBoxId, box.id, undefined, columnId);
      setDraggedItemInfo(null);
      return;
    }

    const draft = createTextItemFromTransfer(event.dataTransfer);

    if (draft) {
      addItemDraftToBox(box.id, draft, columnId);
    }
  };

  const addColumn = (afterColumnId?: string) =>
    dispatch({
      type: 'kanban.column.add',
      boxId: box.id,
      column: {
        id: createId('column'),
        title: t('kanban.newColumn'),
      },
      ...(afterColumnId ? { afterColumnId } : {}),
    });

  const startColumnEdit = (column: KanbanColumn) => {
    setEditingColumnId(column.id);
    setDraftColumnTitle(column.title);
  };

  const finishColumnEdit = (shouldSave: boolean) => {
    try {
      if (shouldSave && editingColumnId) {
        dispatch({
          type: 'kanban.column.update',
          boxId: box.id,
          columnId: editingColumnId,
          title: draftColumnTitle,
        });
      }
    } finally {
      setEditingColumnId(null);
      setDraftColumnTitle('');
    }
  };

  const deleteColumn = (columnId: string) => {
    const fallbackColumn = columns.find((column) => column.id !== columnId);

    dispatch({
      type: 'kanban.column.delete',
      boxId: box.id,
      columnId,
      ...(fallbackColumn ? { fallbackColumnId: fallbackColumn.id } : {}),
    });
  };

  return {
    columns: columns.map((column, index) => ({
      column,
      index,
      items: groupedItems.get(column.id) ?? [],
      canMoveLeft: index > 0,
      canMoveRight: index < columns.length - 1,
      canDelete: columns.length > 1,
    })),
    canAddColumn: columns.length < MAX_KANBAN_COLUMNS,
    dropColumnId,
    dropIndicator,
    setDropColumnId,
    clearDropTarget: clearDropState,
    editingColumnId,
    draftColumnTitle,
    setDraftColumnTitle,
    labels: {
      addColumn: t('kanban.addColumn'),
      columnLimitReached: t('kanban.columnLimitReached'),
      emptyColumn: t('kanban.emptyColumn'),
      renameColumn: t('kanban.renameColumn'),
      deleteColumn: t('kanban.deleteColumn'),
      moveColumnLeft: t('kanban.moveColumnLeft'),
      moveColumnRight: t('kanban.moveColumnRight'),
      saveColumn: t('kanban.saveColumn'),
      cancelColumnEdit: t('kanban.cancelColumnEdit'),
    },
    addColumn,
    startColumnEdit,
    finishColumnEdit,
    deleteColumn,
    moveColumn: (columnId: string, targetIndex: number) =>
      dispatch({
        type: 'kanban.column.move',
        boxId: box.id,
        columnId,
        targetIndex,
      }),
    handleCardDragStart,
    handleCardDragOver,
    handleCardDrop,
    handleCardDragEnd: () => {
      setDraggedItemInfo(null);
      clearDropState();
    },
    handleColumnDrop,
    addExistingItem: (columnId: string, item: ItemDraft) =>
      addItemDraftToBox(box.id, item, columnId),
    addManualItem: (columnId: string, item: ItemDraft) => addItemDraftToBox(box.id, item, columnId),
    updateItem: (item: WorkspaceItem, updates: WorkspaceItemUpdate) =>
      dispatch({
        type: 'item.update',
        boxId: box.id,
        itemId: item.id,
        updates,
      }),
    setItemPinned: (item: PlacedWorkspaceItem, isPinned: boolean) =>
      dispatch({
        type: 'item.setPinned',
        boxId: box.id,
        itemId: item.id,
        isPinned,
      }),
    deleteItem: (item: WorkspaceItem) =>
      dispatch({
        type: 'item.delete',
        boxId: box.id,
        itemId: item.id,
      }),
  };
}

export type ManagedKanbanContentController = ReturnType<typeof useManagedKanbanContent>;

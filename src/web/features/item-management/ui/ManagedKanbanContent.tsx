import { Check, ChevronLeft, ChevronRight, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState, type DragEvent } from 'react';
import type { KanbanColumn } from '../../../../core/domains/workspace/model/workspace';
import type {
  ItemDraft,
  PlacedWorkspaceItem,
  WorkspaceItem,
  WorkspaceItemUpdate,
} from '../../../../core/domains/items/model/item';
import { cn } from '../../../lib/utils';
import type { WorkspaceBox } from '../../../../core/domains/workspace/model/workspace';
import { useAddItem } from '../hooks/useAddItem';
import { useManagedKanbanContent } from '../hooks/useManagedKanbanContent';
import AddItemPanel from './AddItemPanel';
import ManagedItemCard from './ManagedItemCard';

interface ManagedKanbanContentProps {
  box: WorkspaceBox;
}

interface KanbanColumnViewProps {
  column: KanbanColumn;
  columnIndex: number;
  items: PlacedWorkspaceItem[];
  isDropTarget: boolean;
  dropIndicator: {
    columnId: string;
    itemId: string;
    position: 'before' | 'after';
  } | null;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  canDelete: boolean;
  isEditingTitle: boolean;
  draftColumnTitle: string;
  labels: {
    renameColumn: string;
    deleteColumn: string;
    moveColumnLeft: string;
    moveColumnRight: string;
    saveColumn: string;
    cancelColumnEdit: string;
  };
  onColumnDragEnter: (columnId: string) => void;
  onColumnDragLeave: () => void;
  onColumnDrop: (event: DragEvent, columnId: string) => void;
  onStartColumnEdit: (column: KanbanColumn) => void;
  onColumnTitleChange: (value: string) => void;
  onFinishColumnEdit: (shouldSave: boolean) => void;
  onDeleteColumn: (columnId: string) => void;
  onMoveColumn: (columnId: string, targetIndex: number) => void;
  onCardDragStart: (event: DragEvent, itemId: string) => void;
  onCardDragOver: (event: DragEvent, itemId: string, columnId: string) => void;
  onCardDrop: (event: DragEvent, itemId: string, columnId: string) => void;
  onCardDragEnd: () => void;
  onAddExistingItem: (columnId: string, item: ItemDraft) => void;
  onAddManualItem: (columnId: string, item: ItemDraft) => void;
  onUpdateItem: (item: WorkspaceItem, updates: WorkspaceItemUpdate) => void;
  onSetItemPinned: (item: PlacedWorkspaceItem, isPinned: boolean) => void;
  onDeleteItem: (item: WorkspaceItem) => void;
}

function KanbanColumnView({
  column,
  columnIndex,
  items,
  isDropTarget,
  dropIndicator,
  canMoveLeft,
  canMoveRight,
  canDelete,
  isEditingTitle,
  draftColumnTitle,
  labels,
  onColumnDragEnter,
  onColumnDragLeave,
  onColumnDrop,
  onStartColumnEdit,
  onColumnTitleChange,
  onFinishColumnEdit,
  onDeleteColumn,
  onMoveColumn,
  onCardDragStart,
  onCardDragOver,
  onCardDrop,
  onCardDragEnd,
  onAddExistingItem,
  onAddManualItem,
  onUpdateItem,
  onSetItemPinned,
  onDeleteItem,
}: KanbanColumnViewProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addItem = useAddItem({
    showAddMenu,
    onAddExistingItem: (item: ItemDraft) => onAddExistingItem(column.id, item),
    onAddItem: (type, title, content) => onAddManualItem(column.id, { type, title, content }),
    onClose: () => setShowAddMenu(false),
    onOpen: () => setShowAddMenu(true),
  });

  return (
    <section
      className={cn(
        'group flex min-w-[210px] flex-1 flex-col rounded-lg border border-win-border bg-win-bg-secondary transition-colors',
        isDropTarget ? 'border-win-accent bg-win-hover' : '',
      )}
      onDragEnter={(event) => {
        event.preventDefault();
        onColumnDragEnter(column.id);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
          return;
        }

        onColumnDragLeave();
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(event) => onColumnDrop(event, column.id)}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 px-3 py-2">
        {isEditingTitle ? (
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <input
              value={draftColumnTitle}
              onChange={(event) => onColumnTitleChange(event.target.value)}
              onKeyDown={(event) => {
                event.stopPropagation();

                if (event.key === 'Enter') {
                  onFinishColumnEdit(true);
                }

                if (event.key === 'Escape') {
                  onFinishColumnEdit(false);
                }
              }}
              className="kb-box-input min-w-0 flex-1 rounded-md border px-2 py-1 text-sm font-semibold outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={() => onFinishColumnEdit(true)}
              title={labels.saveColumn}
              aria-label={labels.saveColumn}
              className="kb-icon-button rounded-md p-1 transition-colors"
            >
              <Check size={13} />
            </button>
            <button
              type="button"
              onClick={() => onFinishColumnEdit(false)}
              title={labels.cancelColumnEdit}
              aria-label={labels.cancelColumnEdit}
              className="kb-icon-button rounded-md p-1 transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onDoubleClick={() => onStartColumnEdit(column)}
            className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-win-text"
          >
            {column.title}
          </button>
        )}
        <span className="rounded-full bg-win-card px-2 py-0.5 text-xs text-win-text-secondary">
          {items.length}
        </span>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            disabled={!canMoveLeft}
            onClick={() => onMoveColumn(column.id, columnIndex - 1)}
            title={labels.moveColumnLeft}
            className="kb-icon-button rounded-md p-1 transition-colors disabled:opacity-30"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            type="button"
            disabled={!canMoveRight}
            onClick={() => onMoveColumn(column.id, columnIndex + 1)}
            title={labels.moveColumnRight}
            className="kb-icon-button rounded-md p-1 transition-colors disabled:opacity-30"
          >
            <ChevronRight size={13} />
          </button>
          <button
            type="button"
            onClick={() => onStartColumnEdit(column)}
            title={labels.renameColumn}
            className="kb-icon-button rounded-md p-1 transition-colors"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            disabled={!canDelete}
            onClick={() => onDeleteColumn(column.id)}
            title={labels.deleteColumn}
            className="kb-icon-button kb-icon-button-danger rounded-md p-1 transition-colors disabled:opacity-30"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="kb-scroll-hidden flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {items.map((item) => (
          <div
            key={item.id}
            draggable
            onDragStart={(event) => onCardDragStart(event, item.id)}
            onDragOver={(event) => onCardDragOver(event, item.id, column.id)}
            onDrop={(event) => onCardDrop(event, item.id, column.id)}
            onDragEnd={onCardDragEnd}
            className="relative rounded-md bg-win-card shadow-sm transition-opacity"
          >
            {dropIndicator?.columnId === column.id &&
            dropIndicator.itemId === item.id &&
            dropIndicator.position === 'before' ? (
              <div className="absolute -top-1 left-0 z-50 h-1 w-full rounded-full bg-win-accent" />
            ) : null}
            <ManagedItemCard
              item={item}
              layout="list"
              onUpdate={(updates) => onUpdateItem(item, updates)}
              onSetPinned={(isPinned) => onSetItemPinned(item, isPinned)}
              onDelete={() => onDeleteItem(item)}
            />
            {dropIndicator?.columnId === column.id &&
            dropIndicator.itemId === item.id &&
            dropIndicator.position === 'after' ? (
              <div className="absolute -bottom-1 left-0 z-50 h-1 w-full rounded-full bg-win-accent" />
            ) : null}
          </div>
        ))}

        <AddItemPanel
          layout="list"
          addingType={addItem.addingType}
          newItemTitle={addItem.newItemTitle}
          newItemContent={addItem.newItemContent}
          onStartAdd={addItem.handleAddItemType}
          onTitleChange={addItem.setNewItemTitle}
          onContentChange={addItem.setNewItemContent}
          onConfirm={addItem.confirmAdd}
          onCancel={addItem.cancelAdd}
          onOpen={() => setShowAddMenu(true)}
          showAddMenu={showAddMenu}
        />
      </div>
    </section>
  );
}

export default function ManagedKanbanContent({ box }: ManagedKanbanContentProps) {
  const controller = useManagedKanbanContent(box);

  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-3 pt-0">
      {controller.columns.map(({ column, index, items, canMoveLeft, canMoveRight, canDelete }) => (
        <KanbanColumnView
          key={column.id}
          column={column}
          columnIndex={index}
          items={items}
          isDropTarget={controller.dropColumnId === column.id}
          dropIndicator={controller.dropIndicator}
          canMoveLeft={canMoveLeft}
          canMoveRight={canMoveRight}
          canDelete={canDelete}
          isEditingTitle={controller.editingColumnId === column.id}
          draftColumnTitle={controller.draftColumnTitle}
          labels={controller.labels}
          onColumnDragEnter={controller.setDropColumnId}
          onColumnDragLeave={controller.clearDropTarget}
          onColumnDrop={controller.handleColumnDrop}
          onStartColumnEdit={controller.startColumnEdit}
          onColumnTitleChange={controller.setDraftColumnTitle}
          onFinishColumnEdit={controller.finishColumnEdit}
          onDeleteColumn={controller.deleteColumn}
          onMoveColumn={controller.moveColumn}
          onCardDragStart={controller.handleCardDragStart}
          onCardDragOver={controller.handleCardDragOver}
          onCardDrop={controller.handleCardDrop}
          onCardDragEnd={controller.handleCardDragEnd}
          onAddExistingItem={controller.addExistingItem}
          onAddManualItem={controller.addManualItem}
          onUpdateItem={controller.updateItem}
          onSetItemPinned={controller.setItemPinned}
          onDeleteItem={controller.deleteItem}
        />
      ))}
      {controller.canAddColumn ? (
        <button
          type="button"
          onClick={() => controller.addColumn()}
          title={controller.labels.addColumn}
          className="kb-secondary-button flex min-w-[150px] shrink-0 items-center justify-center gap-2 self-stretch rounded-lg border border-dashed border-win-border bg-win-bg-secondary px-3 text-sm transition-colors"
        >
          <Plus size={16} />
          <span>{controller.labels.addColumn}</span>
        </button>
      ) : null}
    </div>
  );
}

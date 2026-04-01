import { useState } from 'react';
import { useUIStore } from '../../domains/ui/store/useUIStore';
import type { BoxData, BoxItemData } from '../../types/box';
import { cn } from '../../lib/utils';
import { useAddItem } from '../../features/item-management/hooks/useAddItem';
import { useBoxDrop } from '../../features/item-management/hooks/useBoxDrop';
import { createItem } from '../../domains/items/services/createItem';
import { useWorkspaceStore } from '../../domains/workspace/store/useWorkspaceStore';
import AddItemPanel from '../../features/item-management/ui/AddItemPanel';
import DraggableItem from '../../features/item-management/ui/DraggableItem';
import DropZoneOverlay from '../../features/item-management/ui/DropZoneOverlay';
import FileItem from '../ItemCard/FileItem';
import NoteItem from '../ItemCard/NoteItem';
import UrlItem from '../ItemCard/UrlItem';

interface BoxContentProps {
  data: BoxData;
  showAddMenu: boolean;
  setShowAddMenu: (show: boolean) => void;
}

export default function BoxContent({ data, showAddMenu, setShowAddMenu }: BoxContentProps) {
  const draggedItemInfo = useUIStore((state) => state.draggedItemInfo);
  const addItem = useWorkspaceStore((state) => state.addItem);
  const updateItem = useWorkspaceStore((state) => state.updateItem);
  const deleteItem = useWorkspaceStore((state) => state.deleteItem);
  const setItemPinned = useWorkspaceStore((state) => state.setItemPinned);
  const [listKey] = useState(() => `box-content-${data.id}`);

  const {
    addingType,
    newItemTitle,
    newItemContent,
    setNewItemTitle,
    setNewItemContent,
    handleAddItemType,
    openDraft,
    confirmAdd,
    cancelAdd,
  } = useAddItem({
    showAddMenu,
    onAddExistingItem: (item) => addItem(data.id, item),
    onAddItem: (type, title, content) =>
      addItem(
        data.id,
        createItem({
          type,
          title,
          content,
        }),
      ),
    onClose: () => setShowAddMenu(false),
    onOpen: () => setShowAddMenu(true),
  });

  const {
    isDragOver,
    dropIndicator,
    handleContainerDragEnter,
    handleContainerDragLeave,
    handleContainerDragOver,
    handleContainerDrop,
    handleItemDragStart,
    handleItemDragOver,
    handleItemDrop,
    handleItemDragEnd,
    bringBoxToFront,
  } = useBoxDrop({
    box: data,
    onOpenExternalDraft: (type, title) => {
      setShowAddMenu(true);
      openDraft(type, title);
    },
  });

  const renderItemContent = (item: BoxItemData) => {
    const commonProps = {
      item,
      layout: data.layout,
      onUpdate: (updates: Partial<BoxItemData>) => updateItem(data.id, item.id, updates),
      onSetPinned: (isPinned: boolean) => setItemPinned(data.id, item.id, isPinned),
      onDelete: () => deleteItem(data.id, item.id),
    };

    if (item.type === 'file' || item.type === 'folder') {
      return <FileItem {...commonProps} />;
    }

    if (item.type === 'url') {
      return <UrlItem {...commonProps} />;
    }

    return <NoteItem {...commonProps} />;
  };

  const renderDraggableItem = (item: BoxItemData) => (
    <DraggableItem
      key={item.id}
      item={item}
      layout={data.layout}
      isBeingDragged={draggedItemInfo?.itemId === item.id}
      dropIndicator={dropIndicator}
      onDragStart={handleItemDragStart}
      onDragOver={handleItemDragOver}
      onDrop={handleItemDrop}
      onDragEnd={handleItemDragEnd}
    >
      {renderItemContent(item)}
    </DraggableItem>
  );

  const pinnedItems = data.items.filter((item) => item.isPinned);
  const regularItems = data.items.filter((item) => !item.isPinned);

  return (
    <div
      key={listKey}
      className={cn(
        'custom-scrollbar relative flex-1 overflow-y-auto p-3 transition-colors duration-200',
        data.layout === 'grid' ? 'grid grid-cols-3 content-start gap-3' : 'flex flex-col gap-1',
        isDragOver && 'bg-blue-500/10',
      )}
      onPointerDown={(event) => {
        event.stopPropagation();
        bringBoxToFront();
      }}
      onDragEnter={handleContainerDragEnter}
      onDragLeave={handleContainerDragLeave}
      onDragOver={handleContainerDragOver}
      onDrop={handleContainerDrop}
    >
      {isDragOver && <DropZoneOverlay />}

      {pinnedItems.map(renderDraggableItem)}
      {pinnedItems.length > 0 && data.layout === 'list' && (
        <div className="kb-list-divider my-1 h-px shrink-0" />
      )}
      {regularItems.map(renderDraggableItem)}

      <AddItemPanel
        layout={data.layout}
        addingType={addingType}
        newItemTitle={newItemTitle}
        newItemContent={newItemContent}
        onStartAdd={handleAddItemType}
        onTitleChange={setNewItemTitle}
        onContentChange={setNewItemContent}
        onConfirm={confirmAdd}
        onCancel={cancelAdd}
        onOpen={() => setShowAddMenu(true)}
        showAddMenu={showAddMenu}
      />
    </div>
  );
}

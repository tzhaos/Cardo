import { useState } from 'react';
import { useUIStore } from '../../domains/ui/store/useUIStore';
import type { BoxData, BoxItemData } from '../../types/box';
import { cn } from '../../lib/utils';
import { useAddItem } from '../../features/item-management/hooks/useAddItem';
import { useBoxDrop } from '../../features/item-management/hooks/useBoxDrop';
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
  onUpdate: (updates: Partial<BoxData>) => void;
}

export default function BoxContent({
  data,
  showAddMenu,
  setShowAddMenu,
  onUpdate,
}: BoxContentProps) {
  const draggedItemInfo = useUIStore((state) => state.draggedItemInfo);
  const [listKey] = useState(() => `box-content-${data.id}`);

  const {
    addingType,
    newItemTitle,
    newItemContent,
    setNewItemTitle,
    setNewItemContent,
    handleAddItemType,
    confirmAdd,
    cancelAdd,
  } = useAddItem({
    box: data,
    showAddMenu,
    onUpdate,
    onClose: () => setShowAddMenu(false),
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
    onUpdate,
  });

  const renderItemContent = (item: BoxItemData) => {
    const commonProps = {
      item,
      layout: data.layout,
      onUpdate: (updates: Partial<BoxItemData>) =>
        onUpdate({
          items: data.items.map((currentItem) =>
            currentItem.id === item.id ? { ...currentItem, ...updates } : currentItem,
          ),
        }),
      onDelete: () =>
        onUpdate({
          items: data.items.filter((currentItem) => currentItem.id !== item.id),
        }),
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
        <div className="my-1 h-px shrink-0 bg-white/10" />
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

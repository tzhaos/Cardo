import { useState } from 'react';
import { addItemDraftToBox } from '../../../app/use-cases/addItemDraftToBox';
import { useInteractionStore } from '../../../app/stores/useInteractionStore';
import { useWorkspaceDispatch } from '../../../app/stores/useWorkspaceSelectors';
import type { WorkspaceItem } from '../../../domains/items/model/item';
import type { WorkspaceBox } from '../../../domains/workspace/model/workspace';
import BoxContent from '../../../widgets/Box/BoxContent';
import { useAddItem } from '../hooks/useAddItem';
import { useBoxDrop } from '../hooks/useBoxDrop';
import AddItemPanel from './AddItemPanel';
import DraggableItem from './DraggableItem';
import DropZoneOverlay from './DropZoneOverlay';
import ManagedItemCard from './ManagedItemCard';

interface ManagedBoxContentProps {
  box: WorkspaceBox;
  showAddMenu: boolean;
  setShowAddMenu: (show: boolean) => void;
}

export default function ManagedBoxContent({
  box,
  showAddMenu,
  setShowAddMenu,
}: ManagedBoxContentProps) {
  const draggedItemInfo = useInteractionStore((state) => state.draggedItemInfo);
  const dispatch = useWorkspaceDispatch();
  const [listKey] = useState(() => `box-content-${box.id}`);

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
    onAddExistingItem: (item) => {
      if (item) {
        addItemDraftToBox(box.id, item);
      }
    },
    onAddItem: (type, title, content) => addItemDraftToBox(box.id, { type, title, content }),
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
    box,
    onOpenExternalDraft: (draft) => {
      setShowAddMenu(true);
      openDraft(draft.type as Extract<typeof draft.type, 'file' | 'folder'>, draft.title ?? '');
    },
  });

  const renderDraggableItem = (item: WorkspaceItem) => (
    <DraggableItem
      key={item.id}
      item={item}
      layout={box.layout}
      isBeingDragged={draggedItemInfo?.itemId === item.id}
      dropIndicator={dropIndicator}
      onDragStart={handleItemDragStart}
      onDragOver={handleItemDragOver}
      onDrop={handleItemDrop}
      onDragEnd={handleItemDragEnd}
    >
      <ManagedItemCard
        item={item}
        layout={box.layout}
        onUpdate={(updates) =>
          dispatch({
            type: 'item.update',
            boxId: box.id,
            itemId: item.id,
            updates,
          })
        }
        onSetPinned={(isPinned) =>
          dispatch({
            type: 'item.setPinned',
            boxId: box.id,
            itemId: item.id,
            isPinned,
          })
        }
        onDelete={() =>
          dispatch({
            type: 'item.delete',
            boxId: box.id,
            itemId: item.id,
          })
        }
      />
    </DraggableItem>
  );

  const pinnedItems = box.items.filter((item) => item.isPinned);
  const regularItems = box.items.filter((item) => !item.isPinned);

  return (
    <BoxContent
      key={listKey}
      layout={box.layout}
      isDragOver={isDragOver}
      onPointerDown={(event) => {
        event.stopPropagation();
        bringBoxToFront();
      }}
      onDragEnter={handleContainerDragEnter}
      onDragLeave={handleContainerDragLeave}
      onDragOver={handleContainerDragOver}
      onDrop={handleContainerDrop}
      overlay={isDragOver ? <DropZoneOverlay /> : null}
      items={
        <>
          {pinnedItems.map(renderDraggableItem)}
          {pinnedItems.length > 0 && box.layout === 'list' && (
            <div className="kb-list-divider my-1 h-px shrink-0" />
          )}
          {regularItems.map(renderDraggableItem)}
        </>
      }
      addPanel={
        <AddItemPanel
          layout={box.layout}
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
      }
    />
  );
}

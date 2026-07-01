import type { PlacedWorkspaceItem } from '../../../../core/domains/items/model/item';
import type { WorkspaceBox } from '../../../../core/domains/workspace/model/workspace';
import BoxContent from '../../../widgets/Box/BoxContent';
import { useManagedBoxContent } from '../hooks/useManagedBoxContent';
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
  const controller = useManagedBoxContent(box, showAddMenu, setShowAddMenu);

  const renderDraggableItem = (item: PlacedWorkspaceItem) => (
    <DraggableItem
      key={item.id}
      item={item}
      layout={box.layout}
      isBeingDragged={controller.isItemBeingDragged(item.id)}
      dropIndicator={controller.drop.dropIndicator}
      onDragStart={controller.drop.handleItemDragStart}
      onDragOver={controller.drop.handleItemDragOver}
      onDrop={controller.drop.handleItemDrop}
      onDragEnd={controller.drop.handleItemDragEnd}
    >
      <ManagedItemCard
        boxId={box.id}
        item={item}
        layout={box.layout}
        onUpdate={(updates) => controller.updateItem(item, updates)}
        onSetPinned={(isPinned) => controller.setItemPinned(item, isPinned)}
        onDelete={() => controller.deleteItem(item)}
      />
    </DraggableItem>
  );

  return (
    <BoxContent
      key={controller.listKey}
      layout={box.layout}
      isDragOver={controller.drop.isDragOver}
      onPointerDown={(event) => {
        event.stopPropagation();
        controller.drop.bringBoxToFront();
      }}
      onDragEnter={controller.drop.handleContainerDragEnter}
      onDragLeave={controller.drop.handleContainerDragLeave}
      onDragOver={controller.drop.handleContainerDragOver}
      onDrop={controller.drop.handleContainerDrop}
      overlay={controller.drop.isDragOver ? <DropZoneOverlay /> : null}
      items={
        <>
          {controller.pinnedItems.map(renderDraggableItem)}
          {controller.pinnedItems.length > 0 && box.layout === 'list' && (
            <div className="kb-list-divider my-1 h-px shrink-0" />
          )}
          {controller.regularItems.map(renderDraggableItem)}
        </>
      }
      addPanel={
        <AddItemPanel
          layout={box.layout}
          addingType={controller.addItem.addingType}
          newItemTitle={controller.addItem.newItemTitle}
          newItemContent={controller.addItem.newItemContent}
          onStartAdd={controller.addItem.handleAddItemType}
          onTitleChange={controller.addItem.setNewItemTitle}
          onContentChange={controller.addItem.setNewItemContent}
          onConfirm={controller.addItem.confirmAdd}
          onCancel={controller.addItem.cancelAdd}
          onOpen={() => setShowAddMenu(true)}
          showAddMenu={showAddMenu}
        />
      }
    />
  );
}

import type { ChangeEvent, DragEvent, PointerEvent } from 'react';
import type { PlacedWorkspaceItem } from '../../../../core/domains/items/model/item';
import type { WorkspaceBox } from '../../../../core/domains/workspace/model/workspace';
import BoxContent from '../../../widgets/Box/BoxContent';
import AddItemPanel from './AddItemPanel';
import DraggableItem from './DraggableItem';
import DropZoneOverlay from './DropZoneOverlay';
import ManagedItemCard from './ManagedItemCard';
import { useManagedInboxContent } from '../hooks/useManagedInboxContent';

interface ManagedInboxContentProps {
  box: WorkspaceBox;
  showAddMenu: boolean;
  setShowAddMenu: (show: boolean) => void;
}

export default function ManagedInboxContent({
  box,
  showAddMenu,
  setShowAddMenu,
}: ManagedInboxContentProps) {
  const controller = useManagedInboxContent(box, showAddMenu, setShowAddMenu);

  const stopControlEvent = (event: DragEvent | PointerEvent) => {
    event.stopPropagation();
  };

  const renderRouteSelector = (item: PlacedWorkspaceItem) => (
    <div
      className="border-t border-win-border bg-win-bg-secondary px-2 py-1.5"
      onPointerDown={stopControlEvent}
      onDragStart={stopControlEvent}
    >
      <select
        defaultValue=""
        disabled={controller.routeTargets.length === 0}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => {
          controller.routeItem(item.id, event.currentTarget.value);
          event.currentTarget.value = '';
        }}
        className="w-full rounded-md border border-win-border bg-win-card px-2 py-1 text-xs text-win-text outline-none transition-colors"
      >
        <option value="">
          {controller.routeTargets.length === 0
            ? controller.labels.noDestinations
            : controller.labels.routePlaceholder}
        </option>
        {controller.routeTargets.map((target) => (
          <option key={target.id} value={target.id}>
            {target.label}
          </option>
        ))}
      </select>
    </div>
  );

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
      <div className="overflow-hidden rounded-md bg-win-card shadow-sm">
        <ManagedItemCard
          item={item}
          layout={box.layout}
          onUpdate={(updates) => controller.updateItem(item, updates)}
          onSetPinned={(isPinned) => controller.setItemPinned(item, isPinned)}
          onDelete={() => controller.deleteItem(item)}
        />
        {renderRouteSelector(item)}
      </div>
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

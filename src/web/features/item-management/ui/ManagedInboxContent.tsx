import { ChevronDown, Clock3, Columns3, Inbox, MoveRight, Search } from 'lucide-react';
import type { DragEvent, KeyboardEvent, PointerEvent } from 'react';
import type { PlacedWorkspaceItem } from '../../../../core/domains/items/model/item';
import type { WorkspaceBox } from '../../../../core/domains/workspace/model/workspace';
import { cn } from '../../../lib/utils';
import BoxContent from '../../../widgets/Box/BoxContent';
import type { InboxRouteTarget } from '../services/inboxRouteTargets';
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
  const isEmpty = controller.pinnedItems.length === 0 && controller.regularItems.length === 0;

  const stopControlEvent = (event: DragEvent | KeyboardEvent | PointerEvent) => {
    event.stopPropagation();
  };

  const renderRouteTarget = (item: PlacedWorkspaceItem, target: InboxRouteTarget) => {
    const TargetIcon = target.columnId ? Columns3 : Inbox;

    return (
      <button
        key={target.id}
        type="button"
        onClick={() => controller.routeItem(item.id, target.id)}
        className="kb-soft-row flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-xs text-win-text transition-colors"
      >
        <TargetIcon size={14} className="shrink-0 text-win-text-secondary" />
        <span className="min-w-0 flex-1">
          <span className="block truncate">{target.boxLabel}</span>
          {target.columnLabel ? (
            <span className="mt-0.5 block truncate text-win-text-secondary">
              {controller.labels.columnTarget(target.columnLabel)}
            </span>
          ) : null}
        </span>
        <MoveRight size={14} className="shrink-0 text-win-text-secondary" />
      </button>
    );
  };

  const renderRouteSection = (
    item: PlacedWorkspaceItem,
    label: string,
    targets: InboxRouteTarget[],
    icon: 'all' | 'recent',
  ) =>
    targets.length > 0 ? (
      <div className="mt-2">
        <div className="mb-1 flex items-center gap-1.5 px-1 text-[11px] text-win-text-secondary">
          {icon === 'recent' ? <Clock3 size={12} /> : <Inbox size={12} />}
          <span>{label}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          {targets.map((target) => renderRouteTarget(item, target))}
        </div>
      </div>
    ) : null;

  const renderRouteSelector = (item: PlacedWorkspaceItem) => (
    <div
      className="border-t border-win-border bg-win-bg-secondary/60 px-2 py-1.5"
      onPointerDown={stopControlEvent}
      onDragStart={stopControlEvent}
      onKeyDown={stopControlEvent}
    >
      <button
        type="button"
        disabled={controller.routeTargets.length === 0}
        onClick={() => controller.toggleRoutePicker(item.id)}
        aria-expanded={controller.openRouteItemId === item.id}
        className="kb-secondary-button flex h-8 w-full items-center gap-2 rounded-full border px-2 text-left text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        <MoveRight size={14} className="shrink-0 text-win-text-secondary" />
        <span className="min-w-0 flex-1 truncate">
          {controller.routeTargets.length === 0
            ? controller.labels.noDestinations
            : controller.labels.routePlaceholder}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            'shrink-0 text-win-text-secondary transition-transform',
            controller.openRouteItemId === item.id ? 'rotate-180' : '',
          )}
        />
      </button>

      {controller.openRouteItemId === item.id ? (
        <div className="kb-add-panel mt-1.5 rounded-2xl border p-1.5">
          <label className="kb-add-input flex h-8 items-center gap-2 rounded-full px-2">
            <Search size={13} className="shrink-0 text-win-text-secondary" />
            <input
              value={controller.routeSearchQuery}
              onChange={(event) => controller.setRouteSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                event.stopPropagation();

                if (event.key === 'Escape') {
                  controller.closeRoutePicker();
                }
              }}
              placeholder={controller.labels.routeSearchPlaceholder}
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-xs text-win-text outline-none placeholder:text-win-text-secondary"
            />
          </label>

          {controller.routeTargets.length === 0 ? (
            <div className="px-2 py-3 text-center text-xs text-win-text-secondary">
              {controller.labels.noDestinations}
            </div>
          ) : controller.routeTargetSections.recentTargets.length === 0 &&
            controller.routeTargetSections.otherTargets.length === 0 ? (
            <div className="px-2 py-3 text-center text-xs text-win-text-secondary">
              {controller.labels.noMatchingDestinations}
            </div>
          ) : (
            <>
              {renderRouteSection(
                item,
                controller.labels.recentDestinations,
                controller.routeTargetSections.recentTargets,
                'recent',
              )}
              {renderRouteSection(
                item,
                controller.labels.allDestinations,
                controller.routeTargetSections.otherTargets,
                'all',
              )}
            </>
          )}
        </div>
      ) : null}
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
      <div className="kb-soft-card overflow-hidden rounded-2xl border">
        <ManagedItemCard
          boxId={box.id}
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
      emptyState={
        isEmpty ? (
          <div className="rounded-2xl border border-dashed border-win-border px-3 py-4 text-center text-sm text-win-text-secondary">
            {controller.labels.empty}
          </div>
        ) : null
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

import { useInteractionStore } from '../../../app/stores/useInteractionStore';
import { cn } from '../../../lib/utils';
import type { WorkspaceItem } from '../../../domains/items/model/item';
import type { WorkspaceBox } from '../../../domains/workspace/model/workspace';

interface DraggableItemProps {
  item: WorkspaceItem;
  layout: WorkspaceBox['layout'];
  isBeingDragged: boolean;
  dropIndicator: { id: string; position: 'before' | 'after' } | null;
  onDragStart: (event: React.DragEvent, itemId: string) => void;
  onDragOver: (event: React.DragEvent, itemId: string) => void;
  onDrop: (event: React.DragEvent, itemId: string) => void;
  onDragEnd: () => void;
  children: React.ReactNode;
}

export default function DraggableItem({
  item,
  layout,
  isBeingDragged,
  dropIndicator,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  children,
}: DraggableItemProps) {
  const editingSessionId = useInteractionStore((state) => state.editingSessionId);
  const dragDisabled = Boolean(editingSessionId);

  return (
    <div
      key={item.id}
      draggable={!dragDisabled}
      onDragStart={(event) => onDragStart(event, item.id)}
      onDragOver={(event) => onDragOver(event, item.id)}
      onDrop={(event) => onDrop(event, item.id)}
      onDragEnd={onDragEnd}
      className={cn(
        'relative transition-all duration-200',
        dragDisabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
        isBeingDragged ? 'scale-95 opacity-30' : 'opacity-100',
      )}
    >
      {dropIndicator?.id === item.id && dropIndicator.position === 'before' && (
        <div
          className={cn(
            'absolute z-50 rounded-full bg-blue-500',
            layout === 'grid' ? '-left-2 top-0 h-full w-1' : '-top-1 left-0 h-1 w-full',
          )}
        />
      )}

      {children}

      {dropIndicator?.id === item.id && dropIndicator.position === 'after' && (
        <div
          className={cn(
            'absolute z-50 rounded-full bg-blue-500',
            layout === 'grid' ? '-right-2 top-0 h-full w-1' : '-bottom-1 left-0 h-1 w-full',
          )}
        />
      )}
    </div>
  );
}

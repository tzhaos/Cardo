import { cn } from '../../../lib/utils';
import type { BoxData, BoxItemData } from '../../../types/box';

interface DraggableItemProps {
  item: BoxItemData;
  layout: BoxData['layout'];
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
  return (
    <div
      key={item.id}
      draggable
      onDragStart={(event) => onDragStart(event, item.id)}
      onDragOver={(event) => onDragOver(event, item.id)}
      onDrop={(event) => onDrop(event, item.id)}
      onDragEnd={onDragEnd}
      className={cn(
        'relative cursor-grab transition-all duration-200 active:cursor-grabbing',
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

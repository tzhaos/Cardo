import type { DragEvent, PointerEvent, ReactNode } from 'react';
import type { WorkspaceBox } from '../../domains/workspace/model/workspace';
import { cn } from '../../lib/utils';

interface BoxContentProps {
  layout: WorkspaceBox['layout'];
  isDragOver: boolean;
  items: ReactNode;
  addPanel: ReactNode;
  overlay?: ReactNode;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onDragEnter: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
}

export default function BoxContent({
  layout,
  isDragOver,
  items,
  addPanel,
  overlay,
  onPointerDown,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
}: BoxContentProps) {
  return (
    <div
      className={cn(
        'custom-scrollbar relative flex-1 overflow-y-auto p-2 pt-0 transition-colors duration-200',
        layout === 'grid' ? 'grid grid-cols-3 content-start gap-2' : 'flex flex-col gap-1',
        isDragOver && 'bg-win-hover',
      )}
      onPointerDown={onPointerDown}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {overlay}
      {items}
      {addPanel}
    </div>
  );
}

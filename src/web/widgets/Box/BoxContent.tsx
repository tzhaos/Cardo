import type { DragEvent, PointerEvent, ReactNode } from 'react';
import type { WorkspaceBox } from '../../../core/domains/workspace/model/workspace';
import { cn } from '../../lib/utils';

interface BoxContentProps {
  layout: WorkspaceBox['layout'];
  isDragOver: boolean;
  items: ReactNode;
  addPanel: ReactNode;
  emptyState?: ReactNode;
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
  emptyState,
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
        'kb-scroll-hidden relative flex-1 overflow-y-auto px-3 pb-3 transition-colors duration-200',
        layout === 'grid' ? 'grid grid-cols-2 content-start gap-2.5 pt-2' : 'flex flex-col gap-1 pt-2',
        isDragOver ? 'bg-win-hover/60' : '',
      )}
      onPointerDown={onPointerDown}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {overlay}
      {items}
      {emptyState}
      {addPanel}
    </div>
  );
}

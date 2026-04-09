import { motion } from 'motion/react';
import type { MouseEvent, ReactNode } from 'react';
import type { WorkspaceBox } from '../../domains/workspace/model/workspace';
import { cn } from '../../lib/utils';

interface BoxContainerProps {
  box: WorkspaceBox;
  isActive: boolean;
  isDragging: boolean;
  editingSessionId: string | null;
  onFocus: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onResizeStart: (event: MouseEvent) => void;
  header: ReactNode;
  content: ReactNode;
}

export default function BoxContainer({
  box,
  isActive,
  isDragging,
  editingSessionId,
  onFocus,
  onMouseEnter,
  onMouseLeave,
  onResizeStart,
  header,
  content,
}: BoxContainerProps) {
  return (
    <motion.div
      onMouseDown={onFocus}
      initial={{ x: box.bounds.x, y: box.bounds.y, opacity: 0, scale: 0.95 }}
      animate={{
        x: box.bounds.x,
        y: box.bounds.y,
        opacity: 1,
        scale: isDragging ? 1.02 : 1,
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={isDragging ? { duration: 0 } : { type: 'spring', stiffness: 350, damping: 25 }}
      style={{
        width: box.bounds.width,
        height: box.bounds.height,
        zIndex: box.zIndex,
        boxShadow: isDragging
          ? 'var(--shadow-win-flyout)'
          : isActive && !box.isLocked
            ? 'var(--shadow-win-flyout)'
            : 'var(--shadow-win-card)',
      }}
      className={cn(
        'kb-box win-mica absolute flex flex-col overflow-hidden rounded-xl transition-[background-color,border-color,color,box-shadow] duration-300',
        box.isLocked ? 'ring-1 ring-red-500/50' : '',
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {header}
      {content}

      {!box.isLocked && (
        <div
          className={cn(
            'absolute bottom-0 right-0 h-4 w-4',
            editingSessionId ? 'cursor-not-allowed opacity-20' : 'cursor-se-resize',
          )}
          onMouseDown={onResizeStart}
        >
          <svg
            viewBox="0 0 24 24"
            className="kb-resize-handle h-full w-full"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15L15 21M21 8L8 21" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </motion.div>
  );
}

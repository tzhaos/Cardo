import { AnimatePresence, motion } from 'motion/react';
import type { MouseEvent, ReactNode } from 'react';
import {
  getRenderedBoxBounds,
  type BoxLayout,
  type WorkspaceBoxBounds,
} from '../../domains/workspace/model/workspace';
import { cn } from '../../lib/utils';

interface BoxContainerProps {
  box: {
    bounds: WorkspaceBoxBounds;
    isCollapsed: boolean;
    isLocked: boolean;
    zIndex: number;
    layout: BoxLayout;
  };
  isActive: boolean;
  isDragging: boolean;
  transitionKind?: 'minimize' | 'restore' | null;
  transitionDockRect?: WorkspaceBoxBounds | null;
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
  transitionKind = null,
  transitionDockRect = null,
  editingSessionId,
  onFocus,
  onMouseEnter,
  onMouseLeave,
  onResizeStart,
  header,
  content,
}: BoxContainerProps) {
  const renderedBounds = getRenderedBoxBounds(box);
  const isMinimizing = transitionKind === 'minimize';
  const isRestoring = transitionKind === 'restore';
  const transitionBounds = transitionDockRect;
  const initialBounds = isRestoring && transitionBounds ? transitionBounds : renderedBounds;
  const animateBounds = isMinimizing && transitionBounds ? transitionBounds : renderedBounds;
  const transitionEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

  return (
    <motion.div
      onMouseDown={onFocus}
      initial={{
        x: initialBounds.x,
        y: initialBounds.y,
        width: initialBounds.width,
        height: initialBounds.height,
        opacity: isRestoring && transitionBounds ? 0.94 : 0,
        borderRadius: isRestoring && transitionBounds ? 18 : 12,
        scale: isRestoring && transitionBounds ? 1 : 0.97,
      }}
      animate={{
        x: animateBounds.x,
        y: animateBounds.y,
        width: animateBounds.width,
        height: animateBounds.height,
        opacity: isMinimizing && transitionBounds ? 0.9 : 1,
        borderRadius: isMinimizing && transitionBounds ? 18 : 12,
        scale: isDragging ? 1.02 : 1,
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={
        isDragging
          ? { duration: 0 }
          : isMinimizing
            ? { duration: 0.28, ease: transitionEase }
            : {
                duration: isRestoring && transitionBounds ? 0.34 : 0.22,
                ease: transitionEase,
              }
      }
      style={{
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
      <AnimatePresence initial={false}>
        {!box.isCollapsed ? (
          <motion.div
            key="box-content"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex min-h-0 flex-1 overflow-hidden"
          >
            {content}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {!box.isLocked && !box.isCollapsed ? (
          <motion.div
            key="resize-handle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
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
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

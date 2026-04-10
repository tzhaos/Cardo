import { AnimatePresence, motion } from 'motion/react';
import type { MouseEvent, ReactNode } from 'react';
import { type BoxLayout, type WorkspaceBoxBounds } from '../../domains/workspace/model/workspace';
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

const COLLAPSED_BOX_HEIGHT = 56;

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
  const renderedBounds = box.isCollapsed
    ? { ...box.bounds, height: COLLAPSED_BOX_HEIGHT }
    : box.bounds;
  const isMinimizing = transitionKind === 'minimize';
  const isRestoring = transitionKind === 'restore';
  const transitionBounds = transitionDockRect;
  const initialBounds = isRestoring && transitionBounds ? transitionBounds : renderedBounds;
  const animateBounds = isMinimizing && transitionBounds ? transitionBounds : renderedBounds;
  const minimizeEase: [number, number, number, number] = [0.2, 0.9, 0.2, 1];
  const restoreEase: [number, number, number, number] = [0.16, 1, 0.3, 1];
  const isTransitioning = isMinimizing || isRestoring;
  const contentTransition =
    isRestoring && transitionBounds
      ? {
          duration: 0.24,
          delay: 0.06,
          ease: restoreEase,
        }
      : isMinimizing && transitionBounds
        ? {
            duration: 0.16,
            ease: minimizeEase,
          }
        : {
            duration: 0.18,
            ease: 'easeOut' as const,
          };

  return (
    <motion.div
      onMouseDown={onFocus}
      initial={{
        x: initialBounds.x,
        y: initialBounds.y,
        width: initialBounds.width,
        height: initialBounds.height,
        opacity: isRestoring && transitionBounds ? 0.82 : 0,
        borderRadius: isRestoring && transitionBounds ? 20 : 12,
        scale: isRestoring && transitionBounds ? 0.84 : 0.97,
      }}
      animate={{
        x: animateBounds.x,
        y: animateBounds.y,
        width: animateBounds.width,
        height: animateBounds.height,
        opacity: isMinimizing && transitionBounds ? 0.8 : 1,
        borderRadius: isTransitioning && transitionBounds ? 20 : 12,
        scale: isDragging ? 1.02 : isMinimizing && transitionBounds ? 0.88 : 1,
        filter: isTransitioning && transitionBounds ? 'saturate(0.94)' : 'saturate(1)',
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={
        isDragging
          ? { duration: 0 }
          : isMinimizing
            ? { duration: 0.28, ease: minimizeEase }
            : {
                type: isRestoring && transitionBounds ? 'spring' : 'tween',
                stiffness: isRestoring && transitionBounds ? 520 : undefined,
                damping: isRestoring && transitionBounds ? 44 : undefined,
                mass: isRestoring && transitionBounds ? 0.88 : undefined,
                duration: isRestoring && transitionBounds ? undefined : 0.22,
                ease: isRestoring && transitionBounds ? undefined : restoreEase,
              }
      }
      style={{
        transformOrigin: 'center center',
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
      <motion.div
        animate={{
          y: isMinimizing && transitionBounds ? -1 : 0,
          opacity: isRestoring && transitionBounds ? 0.98 : 1,
          scale: isMinimizing && transitionBounds ? 0.99 : 1,
        }}
        transition={contentTransition}
      >
        {header}
      </motion.div>

      <AnimatePresence initial={false}>
        {!box.isCollapsed ? (
          <motion.div
            key="box-content"
            initial={
              isRestoring && transitionBounds
                ? { opacity: 0, y: 10, scale: 0.96 }
                : { opacity: 0, y: -6, scale: 0.98 }
            }
            animate={{
              opacity: isMinimizing && transitionBounds ? 0 : 1,
              y: isMinimizing && transitionBounds ? 10 : 0,
              scale: isMinimizing && transitionBounds ? 0.94 : 1,
            }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={contentTransition}
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
            animate={{ opacity: isMinimizing && transitionBounds ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={contentTransition}
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

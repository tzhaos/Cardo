import { AnimatePresence, motion } from 'motion/react';
import type { MouseEvent, ReactNode } from 'react';
import {
  addCameraToBounds,
  type ViewportCamera,
} from '../../../core/domains/layout/model/viewport';
import {
  type BoxLayout,
  type WorkspaceBoxBounds,
} from '../../../core/domains/workspace/model/workspace';
import { cn } from '../../lib/utils';

interface BoxContainerProps {
  placement?: 'canvas' | 'columns';
  box: {
    id: string;
    bounds: WorkspaceBoxBounds;
    isCollapsed: boolean;
    isLocked: boolean;
    zIndex: number;
    layout: BoxLayout;
  };
  isActive: boolean;
  isDragging: boolean;
  isCanvasTransforming: boolean;
  isPanModifierActive: boolean;
  editingSessionId: string | null;
  camera: ViewportCamera;
  onFocus: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onResizeStart: (event: MouseEvent) => void;
  header: ReactNode;
  content: ReactNode;
}

const COLLAPSED_BOX_HEIGHT = 56;

export default function BoxContainer({
  placement = 'canvas',
  box,
  isActive,
  isDragging,
  isCanvasTransforming,
  isPanModifierActive,
  editingSessionId,
  camera,
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
  const renderedScreenBounds = addCameraToBounds(renderedBounds, camera);
  const contentTransition = {
    duration: 0.18,
    ease: 'easeOut' as const,
  };

  if (placement === 'columns') {
    return (
      <motion.div
        data-kb-box-id={box.id}
        onMouseDown={onFocus}
        initial={{
          height: renderedBounds.height,
          opacity: 0,
          borderRadius: 12,
          scale: 0.98,
        }}
        animate={{
          height: renderedBounds.height,
          opacity: 1,
          borderRadius: 12,
          scale: isDragging ? 1.01 : 1,
          filter: 'saturate(1)',
        }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={
          isDragging || isCanvasTransforming
            ? { duration: 0 }
            : { type: 'tween', duration: 0.2, ease: [0.16, 1, 0.3, 1] }
        }
        style={{
          breakInside: 'avoid',
          minHeight: renderedBounds.height,
          zIndex: isActive ? 2 : 1,
          boxShadow: isDragging
            ? 'var(--shadow-win-flyout)'
            : isActive && !box.isLocked
              ? 'var(--shadow-win-flyout)'
              : 'var(--shadow-win-card)',
        }}
        className={cn(
          'kb-box win-mica relative mb-4 inline-flex w-full break-inside-avoid flex-col overflow-hidden rounded-xl align-top transition-[background-color,border-color,color,box-shadow] duration-300',
          box.isLocked ? 'ring-1 ring-red-500/50' : '',
          isPanModifierActive ? 'pointer-events-none' : '',
        )}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <motion.div animate={{ y: 0, opacity: 1, scale: 1 }} transition={contentTransition}>
          {header}
        </motion.div>

        <AnimatePresence initial={false}>
          {!box.isCollapsed ? (
            <motion.div
              key="box-content"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
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
              animate={{ opacity: 1 }}
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

  return (
    <motion.div
      data-kb-box-id={box.id}
      onMouseDown={onFocus}
      initial={{
        left: renderedScreenBounds.x,
        top: renderedScreenBounds.y,
        width: renderedScreenBounds.width,
        height: renderedScreenBounds.height,
        opacity: 0,
        borderRadius: 12,
        scale: 0.97,
      }}
      animate={{
        left: renderedScreenBounds.x,
        top: renderedScreenBounds.y,
        width: renderedScreenBounds.width,
        height: renderedScreenBounds.height,
        opacity: 1,
        borderRadius: 12,
        scale: isDragging ? 1.02 : 1,
        filter: 'saturate(1)',
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={
        isDragging || isCanvasTransforming
          ? { duration: 0 }
          : { type: 'tween', duration: 0.22, ease: [0.16, 1, 0.3, 1] }
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
        isPanModifierActive ? 'pointer-events-none' : '',
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <motion.div
        animate={{
          y: 0,
          opacity: 1,
          scale: 1,
        }}
        transition={contentTransition}
      >
        {header}
      </motion.div>

      <AnimatePresence initial={false}>
        {!box.isCollapsed ? (
          <motion.div
            key="box-content"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
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
            animate={{ opacity: 1 }}
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

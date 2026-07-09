import { AnimatePresence, motion } from 'motion/react';
import type { MouseEvent, ReactNode } from 'react';
import {
  addCameraToBounds,
  type ViewportCamera,
} from '../../../core/domains/layout/model/viewport';
import {
  BOX_MIN_WIDTH,
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
  isMasonryDragging?: boolean;
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
const PRIMARY_BOX_WIDTH = 360;
const PRIMARY_BOX_HEIGHT = 260;

function getBoxSurfaceClassName(box: BoxContainerProps['box'], isActive: boolean, isDragging: boolean) {
  const isPrimary = box.bounds.width >= PRIMARY_BOX_WIDTH || box.bounds.height >= PRIMARY_BOX_HEIGHT;

  return cn(
    'kb-box relative flex flex-col overflow-hidden border transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-200',
    isPrimary ? 'kb-box-primary rounded-[18px]' : 'kb-box-secondary rounded-[14px]',
    isActive ? 'kb-box-active' : 'kb-box-idle',
    isDragging ? 'kb-box-dragging' : '',
    box.isCollapsed ? 'kb-box-collapsed' : '',
    box.isLocked ? 'kb-box-locked' : '',
  );
}

export default function BoxContainer({
  placement = 'canvas',
  box,
  isActive,
  isDragging,
  isMasonryDragging = false,
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
  const className = getBoxSurfaceClassName(box, isActive, isDragging);
  const sharedShadow = isDragging
    ? 'var(--shadow-win-flyout)'
    : isActive && !box.isLocked
      ? 'var(--shadow-win-flyout)'
      : 'var(--shadow-win-card)';

  if (placement === 'columns') {
    return (
      <motion.div
        layout
        layoutId={`masonry-box-${box.id}`}
        data-kb-box-id={box.id}
        onMouseDown={onFocus}
        initial={{
          height: renderedBounds.height,
          opacity: 0,
          borderRadius: 16,
          scale: 0.98,
        }}
        animate={{
          height: renderedBounds.height,
          opacity: 1,
          borderRadius: 16,
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
          width: `min(100%, ${Math.max(BOX_MIN_WIDTH, renderedBounds.width)}px)`,
          minHeight: renderedBounds.height,
          zIndex: isActive ? 2 : 1,
          boxShadow: sharedShadow,
        }}
        className={cn(className, isPanModifierActive ? 'pointer-events-none' : '', isMasonryDragging ? 'opacity-35' : '')}
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
              animate={{ opacity: 1, y: 0, scale: 1 }}
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
                'absolute bottom-1 right-1 h-5 w-5 rounded-full',
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
        borderRadius: 16,
        scale: 0.97,
      }}
      animate={{
        left: renderedScreenBounds.x,
        top: renderedScreenBounds.y,
        width: renderedScreenBounds.width,
        height: renderedScreenBounds.height,
        opacity: 1,
        borderRadius: 16,
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
        boxShadow: sharedShadow,
      }}
      className={cn(className, 'absolute', isPanModifierActive ? 'pointer-events-none' : '')}
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
            animate={{ opacity: 1, y: 0, scale: 1 }}
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
              'absolute bottom-1 right-1 h-5 w-5 rounded-full',
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

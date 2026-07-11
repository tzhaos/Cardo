import { useCallback, useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Reorder, useDragControls } from 'motion/react';
import type { WorkspacePage } from '../../domain/workspace';
import { registerPageDropElement } from '../../app/interactionElementRegistry';
import { useUiStore } from '../../app/stores/uiStore';
import { TabPill } from './TabPill';

const LONG_PRESS_MS = 320;
const MOVE_TOLERANCE = 6;

export function SortablePageTab({
  page,
  active,
  className,
  renameRequested,
  onActivate,
  onRename,
  onRenameRequestHandled,
  onContextMenu,
  onReorderStart,
  onReorderEnd,
  reorderable = true,
}: {
  page: WorkspacePage;
  active: boolean;
  className: string;
  renameRequested: boolean;
  onActivate: () => void;
  onRename: (title: string) => void;
  onRenameRequestHandled: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLElement>) => void;
  onReorderStart: () => void;
  onReorderEnd: () => void;
  reorderable?: boolean;
}) {
  const controls = useDragControls();
  const boxDragActive = useUiStore((state) => Boolean(state.draggedBoxId));
  const registerDropElement = useCallback(
    (element: HTMLDivElement | null) => registerPageDropElement(page.id, element),
    [page.id],
  );
  const cancelLongPressRef = useRef<(() => void) | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => () => cancelLongPressRef.current?.(), []);

  const beginLongPress = (event: ReactPointerEvent<HTMLElement>) => {
    if (!reorderable || event.button !== 0 || !event.isPrimary) return;
    event.persist();
    cancelLongPressRef.current?.();
    const start = { x: event.clientX, y: event.clientY };
    const pointerId = event.pointerId;
    let timerId: number | null = null;
    const cleanup = () => {
      if (timerId !== null) window.clearTimeout(timerId);
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', cleanup, true);
      window.removeEventListener('pointercancel', cleanup, true);
      cancelLongPressRef.current = null;
    };
    const onMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      if (
        Math.abs(moveEvent.clientX - start.x) > MOVE_TOLERANCE ||
        Math.abs(moveEvent.clientY - start.y) > MOVE_TOLERANCE
      ) {
        cleanup();
      }
    };
    timerId = window.setTimeout(() => {
      timerId = null;
      suppressClickRef.current = true;
      cleanup();
      controls.start(event);
    }, LONG_PRESS_MS);
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', cleanup, true);
    window.addEventListener('pointercancel', cleanup, true);
    cancelLongPressRef.current = cleanup;
  };

  return (
    <Reorder.Item
      ref={registerDropElement}
      as="div"
      className={className}
      data-page-drop-id={page.id}
      value={page.id}
      dragControls={controls}
      dragListener={false}
      layout="position"
      initial={boxDragActive ? false : { opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={boxDragActive ? undefined : { opacity: 0, scale: 0.8, width: 0 }}
      whileDrag={{ opacity: 0.68, scale: 1.03, zIndex: 80 }}
      transition={
        boxDragActive
          ? { type: 'tween', duration: 0 }
          : { type: 'spring', bounce: 0, duration: 0.4 }
      }
      onPointerDownCapture={beginLongPress}
      onClickCapture={(event) => {
        if (!suppressClickRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClickRef.current = false;
      }}
      onContextMenu={onContextMenu}
      onDragStart={onReorderStart}
      onDragEnd={() => {
        onReorderEnd();
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
      }}
    >
      <TabPill
        active={active}
        page={page}
        renameRequested={renameRequested}
        onActivate={onActivate}
        onRename={onRename}
        onRenameRequestHandled={onRenameRequestHandled}
      />
    </Reorder.Item>
  );
}

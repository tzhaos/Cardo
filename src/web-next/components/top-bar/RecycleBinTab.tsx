import { Trash2 } from 'lucide-react';
import { Reorder, useDragControls } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';
import type { MouseEventHandler, PointerEvent as ReactPointerEvent } from 'react';
import { registerPageDropElement } from '../../app/interactionElementRegistry';
import { useUiStore } from '../../app/stores/uiStore';
import type { WorkspacePage } from '../../domain/workspace';
import { usePreferencesStore } from '../../app/stores/preferencesStore';
import { useI18n } from '../../i18n/useI18n';
import { TabPill } from './TabPill';

const LONG_PRESS_MS = 320;
const MOVE_TOLERANCE = 6;

interface RecycleBinTabProps {
  page: WorkspacePage;
  active: boolean;
  highlighted: boolean;
  released: boolean;
  reorderable?: boolean;
  onActivate: () => void;
  onContextMenu: MouseEventHandler<HTMLElement>;
  onReorderStart?: () => void;
  onReorderEnd?: () => void;
}

export function RecycleBinTab({
  page,
  active,
  highlighted,
  released,
  reorderable = true,
  onActivate,
  onContextMenu,
  onReorderStart,
  onReorderEnd,
}: RecycleBinTabProps) {
  const { t } = useI18n();
  const isFluent = usePreferencesStore((state) => state.themeId === 'fluent');
  const boxDragActive = useUiStore((state) => Boolean(state.draggedBoxId));
  const controls = useDragControls();
  const cancelLongPressRef = useRef<(() => void) | null>(null);
  const suppressClickRef = useRef(false);
  const registerDropElement = useCallback(
    (element: HTMLDivElement | null) => registerPageDropElement(page.id, element),
    [page.id],
  );

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
      className={[
        'cardo-recycle-bin-tab',
        highlighted ? 'cardo-box-drop-target' : '',
        released ? 'cardo-box-drop-released' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-page-drop-id={page.id}
      value={page.id}
      dragControls={controls}
      dragListener={false}
      layout="position"
      whileDrag={{ opacity: 0.68, scale: 1.03, zIndex: 80 }}
      transition={
        boxDragActive
          ? { type: 'tween', duration: 0 }
          : { type: 'spring', stiffness: 460, damping: 38, mass: 0.72 }
      }
      onPointerDownCapture={beginLongPress}
      onClickCapture={(event) => {
        if (!suppressClickRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClickRef.current = false;
      }}
      onContextMenu={onContextMenu}
      onDragStart={() => onReorderStart?.()}
      onDragEnd={() => {
        onReorderEnd?.();
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
      }}
    >
      <TabPill
        active={active}
        icon={<Trash2 size={16} />}
        page={{ ...page, title: t('page.recycleBin') }}
        showLabel={isFluent}
        systemPage
        onActivate={onActivate}
        onRename={() => undefined}
      />
    </Reorder.Item>
  );
}

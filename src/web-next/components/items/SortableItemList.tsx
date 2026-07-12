import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, Reorder, useDragControls } from 'motion/react';
import type { PanInfo } from 'motion/react';
import { useStagedOrder } from '../../app/motion/useStagedOrder';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import type { BoxItem, WorkspaceBoxViewMode } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';
import { IconButton } from '../../ui/cardo/icon-button';
import { ThemeIcon } from '../../ui/icons/ThemeIcon';

export function SortableItemList<TItem extends BoxItem>({
  boxId,
  items,
  viewMode,
  renderItem,
}: {
  boxId: string;
  items: TItem[];
  viewMode: WorkspaceBoxViewMode;
  renderItem: (item: TItem) => ReactNode;
}) {
  const reorderItems = useWorkspaceStore((state) => state.reorderItems);
  const moveItemBetweenBoxes = useWorkspaceStore((state) => state.moveItemBetweenBoxes);
  const { orderedIds, startReordering, updateOrder, finishReordering, cancelReordering } =
    useStagedOrder(items, (orderedItemIds) => reorderItems(boxId, orderedItemIds));
  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const orderedItems = orderedIds
    .map((itemId) => itemsById.get(itemId))
    .filter((item): item is TItem => Boolean(item));
  const layoutDependency = `${viewMode}:${orderedIds.join(':')}`;
  const isGrid = viewMode === 'grid';
  return (
    <Reorder.Group
      as="div"
      /*
       * Motion Reorder only supports a single axis (defaults to y). Grid still
       * reorders document order; drop hit-testing uses 2D tile centers when isGrid.
       */
      axis="y"
      className={`cardo-item-list${isGrid ? ' cardo-item-list-grid' : ''}`}
      values={orderedIds}
      onReorder={updateOrder}
      onCopy={(event) => {
        const target = event.target;
        if (
          target instanceof Element &&
          target.closest('.cardo-item-view-content') &&
          !target.closest('input,textarea,[contenteditable="true"]')
        ) {
          event.preventDefault();
        }
      }}
    >
      <AnimatePresence initial={false}>
        {orderedItems.map((item) => (
          <SortableItemEntry
            itemId={item.id}
            key={item.id}
            isGrid={isGrid}
            onReorderEnd={finishReordering}
            onReorderStart={startReordering}
            onCrossBoxDrop={(point) => {
              const drop = resolveCrossBoxDrop(boxId, point, isGrid);
              if (!drop) return false;
              cancelReordering();
              moveItemBetweenBoxes(boxId, drop.targetBoxId, item.id, drop.targetIndex);
              return true;
            }}
            layoutDependency={layoutDependency}
          >
            {renderItem(item)}
          </SortableItemEntry>
        ))}
      </AnimatePresence>
    </Reorder.Group>
  );
}

function SortableItemEntry({
  itemId,
  children,
  isGrid,
  onReorderEnd,
  onReorderStart,
  onCrossBoxDrop,
  layoutDependency,
}: {
  itemId: string;
  children: ReactNode;
  isGrid: boolean;
  onReorderEnd: () => void;
  onReorderStart: () => void;
  onCrossBoxDrop: (point: { x: number; y: number }) => boolean;
  layoutDependency: string;
}) {
  const controls = useDragControls();
  const [dragging, setDragging] = useState(false);
  const entryRef = useRef<HTMLDivElement>(null);
  const dragPreviewRef = useRef<HTMLDivElement | null>(null);
  const dragPreviewOffsetRef = useRef({ x: 0, y: 0 });
  const { t } = useI18n();

  const removeDragPreview = () => {
    dragPreviewRef.current?.remove();
    dragPreviewRef.current = null;
  };

  const createDragPreview = (point: { x: number; y: number }) => {
    const entry = entryRef.current;
    if (!entry) return;

    removeDragPreview();
    const rect = entry.getBoundingClientRect();
    const preview = entry.cloneNode(true) as HTMLDivElement;
    dragPreviewOffsetRef.current = {
      x: point.x - rect.left,
      y: point.y - rect.top,
    };
    preview.classList.add('cardo-item-drag-preview');
    preview.removeAttribute('data-item-id');
    preview.setAttribute('aria-hidden', 'true');
    preview.inert = true;
    const entryStyle = window.getComputedStyle(entry);
    preview.style.setProperty('--box-accent', entryStyle.getPropertyValue('--box-accent'));
    preview.style.width = `${rect.width}px`;
    preview.style.height = `${rect.height}px`;
    document.body.appendChild(preview);
    dragPreviewRef.current = preview;
    updateDragPreview(point);
  };

  const updateDragPreview = (point: { x: number; y: number }) => {
    const preview = dragPreviewRef.current;
    if (!preview) return;
    const offset = dragPreviewOffsetRef.current;
    preview.style.transform = `translate3d(${point.x - offset.x}px, ${point.y - offset.y}px, 0) scale(1.018)`;
  };

  useEffect(() => removeDragPreview, []);

  return (
    <Reorder.Item
      ref={entryRef}
      as="div"
      className={`cardo-item-reorder-entry${dragging ? ' cardo-item-reorder-entry-dragging' : ''}`}
      data-item-id={itemId}
      value={itemId}
      dragControls={controls}
      dragElastic={0.06}
      dragListener={false}
      dragMomentum={false}
      layout="position"
      layoutDependency={layoutDependency}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      whileDrag={{
        scale: 1.018,
        zIndex: 30,
        boxShadow: '0 14px 30px rgba(15, 23, 42, 0.14)',
      }}
      transition={{
        layout: { type: 'spring', stiffness: 360, damping: 30, mass: 0.72 },
        opacity: { duration: 0.16 },
        scale: { type: 'spring', stiffness: 520, damping: 38, mass: 0.62 },
      }}
      onDrag={(_event, info: PanInfo) => updateDragPreview(info.point)}
      onDragStart={(_event, info: PanInfo) => {
        setDragging(true);
        createDragPreview(info.point);
        onReorderStart();
      }}
      onDragEnd={(_event, info: PanInfo) => {
        setDragging(false);
        removeDragPreview();
        if (!onCrossBoxDrop(info.point)) {
          onReorderEnd();
        }
      }}
    >
      <IconButton
        className="cardo-item-drag-handle"
        aria-label={t('item.reorder')}
        onPointerDown={(event) => {
          event.preventDefault();
          controls.start(event);
        }}
      >
        <ThemeIcon name="grip" size={14} />
      </IconButton>
      {children}
    </Reorder.Item>
  );
}

function resolveCrossBoxDrop(
  sourceBoxId: string,
  point: { x: number; y: number },
  isGrid: boolean,
) {
  const target = document.elementFromPoint(point.x, point.y);
  const targetBox = target?.closest<HTMLElement>('[data-box-id]');
  const targetBoxId = targetBox?.dataset.boxId;
  if (!targetBox || !targetBoxId || targetBoxId === sourceBoxId) return null;

  const entries = Array.from(
    targetBox.querySelectorAll<HTMLElement>('.cardo-item-reorder-entry[data-item-id]'),
  );
  let targetIndex = entries.length;
  for (let index = 0; index < entries.length; index += 1) {
    const rect = entries[index].getBoundingClientRect();
    if (isGrid) {
      // 2D tile hit: insert before the first cell whose center is past the pointer.
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      if (point.y < centerY - rect.height / 4 || (point.y <= rect.bottom && point.x < centerX)) {
        targetIndex = index;
        break;
      }
    } else if (
      point.y < rect.top ||
      (point.y <= rect.bottom && point.x < rect.left + rect.width / 2)
    ) {
      targetIndex = index;
      break;
    }
  }

  return { targetBoxId, targetIndex };
}

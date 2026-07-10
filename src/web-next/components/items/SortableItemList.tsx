import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { GripVertical } from 'lucide-react';
import { AnimatePresence, Reorder, useDragControls } from 'motion/react';
import { useStagedOrder } from '../../app/motion/useStagedOrder';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import type { BoxItem, WorkspaceBoxViewMode } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';
import { IconButton } from '../primitives/IconPrimitives';

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
  const { orderedIds, startReordering, updateOrder, finishReordering } = useStagedOrder(
    items,
    (orderedItemIds) => reorderItems(boxId, orderedItemIds),
  );
  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const orderedItems = orderedIds
    .map((itemId) => itemsById.get(itemId))
    .filter((item): item is TItem => Boolean(item));

  return (
    <Reorder.Group
      as="div"
      axis="y"
      className={`wbn-item-list${viewMode === 'grid' ? ' wbn-item-list-grid' : ''}`}
      values={orderedIds}
      onReorder={updateOrder}
    >
      <AnimatePresence initial={false}>
        {orderedItems.map((item) => (
          <SortableItemEntry
            itemId={item.id}
            key={item.id}
            onReorderEnd={finishReordering}
            onReorderStart={startReordering}
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
  onReorderEnd,
  onReorderStart,
}: {
  itemId: string;
  children: ReactNode;
  onReorderEnd: () => void;
  onReorderStart: () => void;
}) {
  const controls = useDragControls();
  const [dragging, setDragging] = useState(false);
  const { t } = useI18n();

  return (
    <Reorder.Item
      as="div"
      className={`wbn-item-reorder-entry${dragging ? ' wbn-item-reorder-entry-dragging' : ''}`}
      value={itemId}
      dragControls={controls}
      dragElastic={0.06}
      dragListener={false}
      dragMomentum={false}
      layout="position"
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      whileDrag={{
        scale: 1.018,
        zIndex: 30,
        boxShadow: '0 14px 30px rgba(15, 23, 42, 0.14)',
      }}
      transition={{
        layout: { type: 'spring', stiffness: 520, damping: 42, mass: 0.7 },
        opacity: { duration: 0.16 },
        scale: { type: 'spring', stiffness: 520, damping: 38, mass: 0.62 },
      }}
      onDragStart={() => {
        setDragging(true);
        onReorderStart();
      }}
      onDragEnd={() => {
        setDragging(false);
        onReorderEnd();
      }}
    >
      <IconButton
        className="wbn-item-drag-handle"
        aria-label={t('item.reorder')}
        onPointerDown={(event) => {
          event.preventDefault();
          controls.start(event);
        }}
      >
        <GripVertical size={14} />
      </IconButton>
      {children}
    </Reorder.Item>
  );
}

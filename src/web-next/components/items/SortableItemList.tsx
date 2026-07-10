import { useState } from 'react';
import type { ReactNode } from 'react';
import { GripVertical } from 'lucide-react';
import { AnimatePresence, Reorder, useDragControls } from 'motion/react';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import type { BoxItem } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';

export function SortableItemList<TItem extends BoxItem>({
  boxId,
  items,
  renderItem,
}: {
  boxId: string;
  items: TItem[];
  renderItem: (item: TItem) => ReactNode;
}) {
  const reorderItems = useWorkspaceStore((state) => state.reorderItems);
  const itemIds = items.map((item) => item.id);

  return (
    <Reorder.Group
      as="div"
      axis="y"
      className="wbn-item-list"
      values={itemIds}
      onReorder={(orderedItemIds) => reorderItems(boxId, orderedItemIds)}
    >
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <SortableItemEntry itemId={item.id} key={item.id}>
            {renderItem(item)}
          </SortableItemEntry>
        ))}
      </AnimatePresence>
    </Reorder.Group>
  );
}

function SortableItemEntry({ itemId, children }: { itemId: string; children: ReactNode }) {
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
      onDragStart={() => setDragging(true)}
      onDragEnd={() => setDragging(false)}
    >
      <button
        className="wbn-item-drag-handle"
        type="button"
        aria-label={t('item.reorder')}
        onPointerDown={(event) => {
          event.preventDefault();
          controls.start(event);
        }}
      >
        <GripVertical size={14} />
      </button>
      {children}
    </Reorder.Item>
  );
}

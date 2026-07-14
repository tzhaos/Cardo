import { useMemo, useState } from 'react';
import { useUiStore } from '../../app/stores/uiStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import type { BoxItem } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';
import { Button } from '../../kit/button';
import { IconButton } from '../../kit/icon-button';
import { ThemeIcon } from '../../kit/icon';

/** Floating bar when 2+ items are selected in a single box. */
export function ItemMultiSelectBar({ boxId, items }: { boxId: string; items: BoxItem[] }) {
  const { t } = useI18n();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const selectedItemIds = useUiStore((state) => state.selectedItemIds);
  const selectionBoxId = useUiStore((state) => state.selectionBoxId);
  const clearItemSelection = useUiStore((state) => state.clearItemSelection);
  const setItemPinned = useWorkspaceStore((state) => state.setItemPinned);
  const deleteItem = useWorkspaceStore((state) => state.deleteItem);

  const selectedItems = useMemo(() => {
    if (selectionBoxId !== boxId) return [];
    return items.filter((item) => selectedItemIds[item.id]);
  }, [boxId, items, selectedItemIds, selectionBoxId]);

  if (selectionBoxId !== boxId || selectedItems.length < 2) return null;

  const anyPinned = selectedItems.some((item) => item.isPinned);
  const anyUnpinned = selectedItems.some((item) => !item.isPinned);

  const applyPin = (isPinned: boolean) => {
    for (const item of selectedItems) {
      if (item.isPinned !== isPinned) {
        setItemPinned(boxId, item.id, isPinned);
      }
    }
  };

  const confirmBulkDelete = () => {
    for (const item of selectedItems) {
      deleteItem(boxId, item.id);
    }
    setConfirmDelete(false);
    clearItemSelection();
  };

  if (confirmDelete) {
    return (
      <div
        className="cardo-item-multi-select-bar cardo-item-multi-select-bar-confirm"
        role="status"
      >
        <span className="cardo-item-multi-select-label">
          {t('item.bulkDeleteQuestion', { count: selectedItems.length })}
        </span>
        <span className="cardo-item-multi-select-actions">
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="button" variant="danger" size="sm" onClick={confirmBulkDelete}>
            {t('common.delete')}
          </Button>
        </span>
      </div>
    );
  }

  return (
    <div className="cardo-item-multi-select-bar" role="toolbar" aria-label={t('item.bulkActions')}>
      <span className="cardo-item-multi-select-label">
        {t('item.selectedCount', { count: selectedItems.length })}
      </span>
      <span className="cardo-item-multi-select-actions">
        {anyUnpinned ? (
          <IconButton
            aria-label={t('item.pin')}
            tooltip={t('item.pin')}
            onClick={() => applyPin(true)}
          >
            <ThemeIcon name="pin" size={14} />
          </IconButton>
        ) : null}
        {anyPinned ? (
          <IconButton
            aria-label={t('item.unpin')}
            tooltip={t('item.unpin')}
            onClick={() => applyPin(false)}
          >
            <ThemeIcon name="pinOff" size={14} />
          </IconButton>
        ) : null}
        <IconButton
          className="cardo-item-delete"
          aria-label={t('item.delete')}
          tooltip={t('item.delete')}
          onClick={() => setConfirmDelete(true)}
        >
          <ThemeIcon name="trash" size={14} />
        </IconButton>
        <IconButton
          aria-label={t('common.close')}
          tooltip={t('common.close')}
          onClick={() => clearItemSelection()}
        >
          <ThemeIcon name="close" size={14} />
        </IconButton>
      </span>
    </div>
  );
}

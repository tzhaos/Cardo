import { Edit2, Pin, PinOff, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n/useI18n';
import { IconButton } from '../../ui/khaos/icon-button';

export function ItemActions({
  pinned = false,
  onPin,
  onEdit,
  onDelete,
}: {
  pinned?: boolean;
  onPin: () => void;
  onEdit?: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="wbn-item-actions">
      <IconButton
        className="wbn-item-pin"
        aria-label={t(pinned ? 'item.unpin' : 'item.pin')}
        aria-pressed={pinned}
        onClick={onPin}
      >
        {pinned ? <PinOff size={14} /> : <Pin size={14} />}
      </IconButton>
      {onEdit ? (
        <IconButton aria-label={t('item.editContent')} onClick={onEdit}>
          <Edit2 size={14} />
        </IconButton>
      ) : null}
      <IconButton className="wbn-item-delete" aria-label={t('item.delete')} onClick={onDelete}>
        <Trash2 size={14} />
      </IconButton>
    </div>
  );
}

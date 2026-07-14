import { useI18n } from '../../i18n/useI18n';
import { IconButton } from '../../kit/icon-button';
import { ThemeIcon } from '../../kit/icon';

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
    <div className="cardo-item-actions">
      <IconButton
        className="cardo-item-pin"
        aria-label={t(pinned ? 'item.unpin' : 'item.pin')}
        aria-pressed={pinned}
        tooltip={t(pinned ? 'item.unpin' : 'item.pin')}
        onClick={onPin}
      >
        {pinned ? <ThemeIcon name="pinOff" size={13} /> : <ThemeIcon name="pin" size={13} />}
      </IconButton>
      {onEdit ? (
        <IconButton
          aria-label={t('item.editContent')}
          tooltip={t('item.editContent')}
          onClick={onEdit}
        >
          <ThemeIcon name="edit" size={13} />
        </IconButton>
      ) : null}
      <IconButton
        className="cardo-item-delete"
        aria-label={t('item.delete')}
        tooltip={t('item.delete')}
        onClick={onDelete}
      >
        <ThemeIcon name="trash" size={13} />
      </IconButton>
    </div>
  );
}

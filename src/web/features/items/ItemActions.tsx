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
        onClick={onPin}
      >
        {pinned ? <ThemeIcon name="pinOff" size={12} /> : <ThemeIcon name="pin" size={12} />}
      </IconButton>
      {onEdit ? (
        <IconButton aria-label={t('item.editContent')} onClick={onEdit}>
          <ThemeIcon name="edit" size={12} />
        </IconButton>
      ) : null}
      <IconButton className="cardo-item-delete" aria-label={t('item.delete')} onClick={onDelete}>
        <ThemeIcon name="trash" size={12} />
      </IconButton>
    </div>
  );
}

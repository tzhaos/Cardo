import { Check, Copy, Edit2, Pin, PinOff, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n/useI18n';
import { IconButton } from '../primitives/IconPrimitives';

export function ItemActions({
  copied = false,
  pinned = false,
  onCopy,
  onPin,
  onEdit,
  onDelete,
}: {
  copied?: boolean;
  pinned?: boolean;
  onCopy?: () => void | Promise<void>;
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
      {onCopy ? (
        <IconButton
          className={`wbn-item-copy${copied ? ' wbn-item-copy-done' : ''}`}
          aria-label={copied ? t('item.copied') : t('item.copy')}
          onClick={onCopy}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </IconButton>
      ) : null}
      {onEdit ? (
        <IconButton aria-label={t('item.rename')} onClick={onEdit}>
          <Edit2 size={14} />
        </IconButton>
      ) : null}
      <IconButton className="wbn-item-delete" aria-label={t('item.delete')} onClick={onDelete}>
        <Trash2 size={14} />
      </IconButton>
    </div>
  );
}

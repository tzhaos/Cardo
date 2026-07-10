import { Check, Copy, Edit2, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n/useI18n';
import { IconButton } from '../primitives/IconPrimitives';

export function ItemActions({
  copied = false,
  onCopy,
  onEdit,
  onDelete,
}: {
  copied?: boolean;
  onCopy?: () => void | Promise<void>;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="wbn-item-actions">
      {onCopy ? (
        <IconButton
          className={`wbn-item-copy${copied ? ' wbn-item-copy-done' : ''}`}
          aria-label={copied ? t('item.copied') : t('item.copy')}
          onClick={onCopy}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </IconButton>
      ) : null}
      <IconButton aria-label={t('item.rename')} onClick={onEdit}>
        <Edit2 size={14} />
      </IconButton>
      <IconButton className="wbn-item-delete" aria-label={t('item.delete')} onClick={onDelete}>
        <Trash2 size={14} />
      </IconButton>
    </div>
  );
}

import { Check, Copy, Edit2, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n/useI18n';

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
        <button
          className={`wbn-item-copy${copied ? ' wbn-item-copy-done' : ''}`}
          type="button"
          aria-label={copied ? t('item.copied') : t('item.copy')}
          onClick={onCopy}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      ) : null}
      <button type="button" aria-label={t('item.rename')} onClick={onEdit}>
        <Edit2 size={14} />
      </button>
      <button
        className="wbn-item-delete"
        type="button"
        aria-label={t('item.delete')}
        onClick={onDelete}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

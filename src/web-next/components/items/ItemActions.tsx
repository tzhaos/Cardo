import { Edit2, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n/useI18n';

export function ItemActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const { t } = useI18n();

  return (
    <div className="wbn-item-actions">
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

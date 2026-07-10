import { Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useI18n } from '../../i18n/useI18n';

export function ItemDeleteView({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n();

  return (
    <motion.div
      className="wbn-item-delete-view"
      role="alertdialog"
      aria-label={t('item.deleteConfirmation')}
      initial={{ opacity: 0, x: 8, scale: 0.985 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 8, scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.62 }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          onCancel();
        }
      }}
    >
      <span className="wbn-item-delete-copy">
        <Trash2 size={15} />
        <span>{t('item.deleteQuestion')}</span>
      </span>
      <span className="wbn-item-delete-actions">
        <button autoFocus type="button" onClick={onCancel}>
          {t('common.cancel')}
        </button>
        <button className="wbn-item-delete-confirm" type="button" onClick={onConfirm}>
          {t('common.delete')}
        </button>
      </span>
    </motion.div>
  );
}

import { Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useI18n } from '../../i18n/useI18n';
import { IconFrame } from '../../ui/khaos/icon-button';
import { Button } from '../../ui/primitives/button';

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
        <IconFrame>
          <Trash2 size={15} />
        </IconFrame>
        <span>{t('item.deleteQuestion')}</span>
      </span>
      <span className="wbn-item-delete-actions">
        <Button autoFocus variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button className="wbn-item-delete-confirm" variant="danger" onClick={onConfirm}>
          {t('common.delete')}
        </Button>
      </span>
    </motion.div>
  );
}

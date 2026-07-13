import { motion } from 'motion/react';
import { useI18n } from '../../i18n/useI18n';
import { IconFrame } from '../../kit/icon-button';
import { ThemeIcon } from '../../kit/icon';
import { Button } from '../../kit/button';

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
      className="cardo-item-delete-view"
      role="alertdialog"
      aria-label={t('item.deleteConfirmation')}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          onCancel();
        }
      }}
    >
      <span className="cardo-item-delete-copy">
        <IconFrame>
          <ThemeIcon name="trash" size={15} />
        </IconFrame>
        <span>{t('item.deleteQuestion')}</span>
      </span>
      <span className="cardo-item-delete-actions">
        <Button autoFocus variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {t('common.delete')}
        </Button>
      </span>
    </motion.div>
  );
}

import { useI18n } from '../../i18n/useI18n';
import { ConfirmBar } from '../../kit/confirm-bar';

interface TabDeleteConfirmViewProps {
  title: string;
  boxCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Page delete confirmation — kit ConfirmBar (sidebar-friendly). */
export function TabDeleteConfirmView({
  title,
  boxCount,
  onCancel,
  onConfirm,
}: TabDeleteConfirmViewProps) {
  const { t } = useI18n();
  const boxLabel = boxCount === 1 ? t('common.box') : t('common.boxes');

  return (
    <ConfirmBar
      aria-label={t('page.deleteConfirmation')}
      message={t('page.deleteWithRecycleBinQuestion', {
        title,
        count: boxCount,
        boxes: boxLabel,
      })}
      cancelLabel={t('common.cancel')}
      confirmLabel={t('common.delete')}
      onCancel={onCancel}
      onConfirm={onConfirm}
      danger
    />
  );
}

interface TabDeleteConfirmViewProps {
  title: string;
  boxCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export function TabDeleteConfirmView({
  title,
  boxCount,
  onCancel,
  onConfirm,
}: TabDeleteConfirmViewProps) {
  const { t } = useI18n();
  const boxLabel = boxCount === 1 ? t('common.box') : t('common.boxes');

  return (
    <div className="wbn-tab-confirm" role="alertdialog" aria-label={t('page.deleteConfirmation')}>
      <span>
        {t('page.deleteWithRecycleBinQuestion', { title, count: boxCount, boxes: boxLabel })}
      </span>
      <div>
        <button type="button" onClick={onCancel}>
          {t('common.cancel')}
        </button>
        <button className="wbn-danger-button" type="button" onClick={onConfirm}>
          {t('common.delete')}
        </button>
      </div>
    </div>
  );
}
import { useI18n } from '../../i18n/useI18n';

import { useI18n } from '../../i18n/useI18n';
import { Button } from '../../ui/primitives/button';

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
        <Button variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button className="wbn-danger-button" variant="danger" onClick={onConfirm}>
          {t('common.delete')}
        </Button>
      </div>
    </div>
  );
}

import { useI18n } from '../../i18n/useI18n';
import { Button } from '../../kit/button';

/**
 * In-box delete confirmation for waterfall/list morphologies
 * (mirrors freeform BaseBoxFrame delete view).
 */
export function GroupBoxDeleteView({
  permanent,
  onCancel,
  onConfirm,
}: {
  permanent: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className="cardo-group-box-delete-confirm"
      role="alertdialog"
      aria-modal="true"
      aria-label={t(permanent ? 'box.deletePermanentlyQuestion' : 'box.moveToRecycleBinQuestion', {
        type: t('box.general'),
      })}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onCancel();
        }
      }}
    >
      <p>
        {t(permanent ? 'box.deletePermanentlyQuestion' : 'box.moveToRecycleBinQuestion', {
          type: t('box.general'),
        })}
      </p>
      <div className="cardo-group-box-delete-actions">
        <Button type="button" variant="ghost" autoFocus onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button
          type="button"
          variant="danger"
          className="cardo-group-box-delete-confirm-button"
          onClick={onConfirm}
        >
          {t(permanent ? 'common.deletePermanently' : 'common.moveToRecycleBin')}
        </Button>
      </div>
    </div>
  );
}

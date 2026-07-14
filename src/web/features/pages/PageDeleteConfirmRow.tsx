import { useEffect, useRef } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { Button } from '../../kit/button';
import { ThemeIcon } from '../../kit/icon';

/**
 * Row-scoped group delete confirmation (sidebar item, not full-nav ConfirmBar).
 * Aligns with ItemDeleteView density: short copy + cancel-first focus.
 */
export function PageDeleteConfirmRow({
  title,
  boxCount,
  onCancel,
  onConfirm,
}: {
  title: string;
  boxCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  const boxLabel = boxCount === 1 ? t('common.box') : t('common.boxes');
  const shortMessage = t('page.deleteShort', { title });
  const detail =
    boxCount > 0 ? t('page.deleteCountHint', { count: boxCount, boxes: boxLabel }) : null;

  useEffect(() => {
    const cancel = rootRef.current?.querySelector<HTMLButtonElement>(
      'button[data-page-delete-cancel]',
    );
    cancel?.focus({ preventScroll: true });
  }, []);

  return (
    <div
      ref={rootRef}
      className="cardo-v2-page-delete-confirm"
      role="alertdialog"
      aria-modal="false"
      aria-label={t('page.deleteConfirmation')}
      data-sidebar-delete-row=""
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onCancel();
        }
      }}
    >
      <span className="cardo-v2-page-delete-copy">
        <ThemeIcon name="trash" size={14} />
        <span className="cardo-v2-page-delete-text" title={title}>
          <span className="cardo-v2-page-delete-msg">{shortMessage}</span>
          {detail ? <small className="cardo-v2-page-delete-detail">{detail}</small> : null}
        </span>
      </span>
      <span className="cardo-v2-page-delete-actions">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          data-page-delete-cancel=""
          onClick={onCancel}
        >
          {t('common.cancel')}
        </Button>
        <Button type="button" size="sm" variant="danger" onClick={onConfirm}>
          {t('common.delete')}
        </Button>
      </span>
    </div>
  );
}

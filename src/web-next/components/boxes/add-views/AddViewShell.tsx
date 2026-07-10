import type { WorkspaceBoxType } from '../../../domain/workspace';
import { useUiStore } from '../../../app/stores/uiStore';
import { useWorkspaceStore } from '../../../app/stores/workspaceStore';
import { useI18n } from '../../../i18n/useI18n';

interface AddViewShellProps {
  boxId: string;
  type: WorkspaceBoxType;
  title: string;
  children: React.ReactNode;
  primaryLabel?: string;
}

export function AddViewShell({ boxId, type, title, children, primaryLabel }: AddViewShellProps) {
  const draftState = useUiStore((state) => state.addDrafts[boxId]);
  const requestCloseAddView = useUiStore((state) => state.requestCloseAddView);
  const confirmDiscard = useUiStore((state) => state.confirmDiscard);
  const cancelDiscard = useUiStore((state) => state.cancelDiscard);
  const markCreated = useUiStore((state) => state.markCreated);
  const createItem = useWorkspaceStore((state) => state.createItem);
  const { t } = useI18n();

  return (
    <form
      className="wbn-add-view"
      aria-label={title}
      onSubmit={(event) => {
        event.preventDefault();
        const item = createItem(boxId, type, draftState?.draft ?? {});
        markCreated(boxId, item.id);
      }}
    >
      {children}
      {draftState?.confirmDiscard ? (
        <div className="wbn-discard-confirm">
          <span>{t('add.discardQuestion')}</span>
          <button type="button" onClick={() => cancelDiscard(boxId)}>
            {t('common.keep')}
          </button>
          <button type="button" onClick={() => confirmDiscard(boxId)}>
            {t('common.discard')}
          </button>
        </div>
      ) : null}
      <div className="wbn-add-actions">
        <button className="wbn-add-cancel" type="button" onClick={() => requestCloseAddView(boxId)}>
          {t('common.cancel')}
        </button>
        <button className="wbn-add-primary" type="submit">
          {primaryLabel ?? t('common.save')}
        </button>
      </div>
    </form>
  );
}

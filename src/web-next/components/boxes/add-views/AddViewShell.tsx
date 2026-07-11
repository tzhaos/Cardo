import type { WorkspaceItemType } from '../../../domain/workspace';
import { useUiStore } from '../../../app/stores/uiStore';
import { useWorkspaceStore } from '../../../app/stores/workspaceStore';
import { useI18n } from '../../../i18n/useI18n';

interface AddViewShellProps {
  boxId: string;
  type: WorkspaceItemType;
  title: string;
  children: React.ReactNode;
  typePicker?: React.ReactNode;
  canSubmit?: boolean;
  primaryLabel?: string;
}

export function AddViewShell({
  boxId,
  type,
  title,
  children,
  typePicker,
  canSubmit = true,
  primaryLabel,
}: AddViewShellProps) {
  const draftState = useUiStore((state) => state.addDrafts[boxId]);
  const closeAddView = useUiStore((state) => state.closeAddView);
  const markCreated = useUiStore((state) => state.markCreated);
  const createItem = useWorkspaceStore((state) => state.createItem);
  const { t } = useI18n();

  return (
    <form
      className="wbn-add-view"
      aria-label={title}
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSubmit) {
          return;
        }
        void createItem(boxId, type, draftState?.draft ?? {})
          .then((item) => markCreated(boxId, item.id))
          .catch((error: unknown) => console.error('Failed to create Item', error));
      }}
    >
      {typePicker}
      {children}
      <div className="wbn-add-actions">
        <button className="wbn-add-cancel" type="button" onClick={() => closeAddView(boxId)}>
          {t('common.cancel')}
        </button>
        <button className="wbn-add-primary" type="submit" disabled={!canSubmit}>
          {primaryLabel ?? t('common.save')}
        </button>
      </div>
    </form>
  );
}

import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { useI18n } from '../../i18n/useI18n';
import { IconButton } from '../../ui/cardo/icon-button';
import { ThemeIcon } from '../../ui/icons/ThemeIcon';

export function HistoryToolbar() {
  const undo = useWorkspaceStore((state) => state.undo);
  const redo = useWorkspaceStore((state) => state.redo);
  const canUndo = useWorkspaceStore((state) => state.historyPast.length > 0);
  const canRedo = useWorkspaceStore((state) => state.historyFuture.length > 0);
  const { t } = useI18n();

  return (
    <aside className="cardo-history-controls" aria-label={t('history.controls')}>
      <IconButton
        disabled={!canUndo}
        onClick={undo}
        aria-label={t('history.undo')}
        tooltip={t('history.undo')}
      >
        <ThemeIcon name="undo" size={17} />
      </IconButton>
      <IconButton
        disabled={!canRedo}
        onClick={redo}
        aria-label={t('history.redo')}
        tooltip={t('history.redo')}
      >
        <ThemeIcon name="redo" size={17} />
      </IconButton>
    </aside>
  );
}

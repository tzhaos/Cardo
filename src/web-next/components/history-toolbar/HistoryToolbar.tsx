import { Redo2, Undo2 } from 'lucide-react';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { useI18n } from '../../i18n/useI18n';
import { IconButton } from '../../ui/khaos/icon-button';

export function HistoryToolbar() {
  const undo = useWorkspaceStore((state) => state.undo);
  const redo = useWorkspaceStore((state) => state.redo);
  const canUndo = useWorkspaceStore((state) => state.historyPast.length > 0);
  const canRedo = useWorkspaceStore((state) => state.historyFuture.length > 0);
  const { t } = useI18n();
  const sharedHint = t('history.sharedStackHint');

  return (
    <aside
      className="wbn-history-controls"
      aria-label={t('history.controls')}
      title={sharedHint}
    >
      <IconButton
        disabled={!canUndo}
        onClick={undo}
        aria-label={t('history.undo')}
        title={`${t('history.undo')}. ${sharedHint}`}
        tooltip={
          <>
            {t('history.undo')}
            <span className="wbn-history-shared-hint-detail">{sharedHint}</span>
          </>
        }
      >
        <Undo2 size={17} />
      </IconButton>
      <IconButton
        disabled={!canRedo}
        onClick={redo}
        aria-label={t('history.redo')}
        title={`${t('history.redo')}. ${sharedHint}`}
        tooltip={
          <>
            {t('history.redo')}
            <span className="wbn-history-shared-hint-detail">{sharedHint}</span>
          </>
        }
      >
        <Redo2 size={17} />
      </IconButton>
    </aside>
  );
}

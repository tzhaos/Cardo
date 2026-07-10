import { useEffect } from 'react';
import { Undo2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useWorkspaceStore, type WorkspaceHistoryAction } from '../../app/stores/workspaceStore';
import { useI18n } from '../../i18n/useI18n';

export function HistoryToast() {
  const notice = useWorkspaceStore((state) => state.historyNotice);
  const undo = useWorkspaceStore((state) => state.undo);
  const dismiss = useWorkspaceStore((state) => state.dismissHistoryNotice);
  const { t } = useI18n();

  useEffect(() => {
    if (!notice) return;
    const timeoutId = window.setTimeout(dismiss, 5000);
    return () => window.clearTimeout(timeoutId);
  }, [dismiss, notice]);

  return (
    <AnimatePresence>
      {notice ? (
        <motion.div
          className="wbn-history-toast"
          key={notice.id}
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
        >
          <span>{t(getHistoryMessageKey(notice.action))}</span>
          <button type="button" onClick={undo}>
            <Undo2 size={14} />
            <span>{t('history.undo')}</span>
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function getHistoryMessageKey(action: WorkspaceHistoryAction) {
  return `history.${action}` as const;
}

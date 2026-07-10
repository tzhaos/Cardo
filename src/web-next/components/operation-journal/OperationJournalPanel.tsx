import { useMemo, useState } from 'react';
import type { PointerEventHandler } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  ChevronRight,
  Clock3,
  Database,
  Download,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  recordOperation,
  useOperationJournalStore,
  type OperationCategory,
  type OperationEvent,
} from '../../app/stores/operationJournalStore';
import { useUiStore } from '../../app/stores/uiStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { useI18n } from '../../i18n/useI18n';

type JournalFilter = 'all' | OperationCategory;

export function OperationJournalPanel({
  onClose,
  onHeaderPointerDown,
}: {
  onClose: () => void;
  onHeaderPointerDown?: PointerEventHandler<HTMLElement>;
}) {
  const events = useOperationJournalStore((state) => state.events);
  const clear = useOperationJournalStore((state) => state.clear);
  const snapshot = useWorkspaceStore((state) => state.snapshot);
  const setActivePage = useWorkspaceStore((state) => state.setActivePage);
  const selectBox = useUiStore((state) => state.selectBox);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<JournalFilter>('all');
  const [confirmClear, setConfirmClear] = useState(false);
  const { t, locale } = useI18n();

  const visibleEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return [...events]
      .reverse()
      .filter((event) => filter === 'all' || event.category === filter)
      .filter((event) => {
        if (!normalizedQuery) return true;
        const target = event.target;
        return [
          getActionLabel(event.action, t),
          target?.pageTitle,
          target?.boxTitle,
          target?.itemTitle,
          ...Object.values(event.details ?? {}),
        ]
          .filter((value) => value !== null && value !== undefined)
          .some((value) => String(value).toLocaleLowerCase().includes(normalizedQuery));
      });
  }, [events, filter, query, t]);

  const locateEvent = (event: OperationEvent) => {
    const target = event.target;
    const box = target?.boxId
      ? snapshot.boxes.find((candidate) => candidate.id === target.boxId)
      : undefined;
    if (box) {
      setActivePage(box.pageId, 'journal');
      selectBox(box.id);
      onClose();
      return;
    }
    const page = target?.pageId
      ? snapshot.pages.find((candidate) => candidate.id === target.pageId)
      : undefined;
    if (page) {
      setActivePage(page.id, 'journal');
      selectBox(null);
      onClose();
    }
  };

  const exportEvents = () => {
    const exportedAt = new Date().toISOString();
    const payload = {
      format: 'khaosbox-operation-journal',
      version: 1,
      exportedAt,
      privacy: 'redacted',
      retention: { maximumEvents: 5000, maximumAgeDays: 90 },
      events,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `khaosbox-operation-log-${exportedAt.slice(0, 10)}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    recordOperation({
      category: 'system',
      action: 'journal.export',
      source: 'system',
      undoable: false,
      details: { eventCount: events.length },
    });
  };

  let previousDateKey = '';

  return (
    <div className="wbn-journal-panel" role="dialog" aria-label={t('journal.title')}>
      <header className="wbn-journal-header" onPointerDown={onHeaderPointerDown}>
        <span>
          <Clock3 size={17} />
          <strong>{t('journal.title')}</strong>
          <small>{t('journal.eventCount', { count: events.length })}</small>
        </span>
        <motion.button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          whileTap={{ scale: 0.88, rotate: 8 }}
        >
          <X size={16} />
        </motion.button>
      </header>
      <div className="wbn-journal-search">
        <Search size={15} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('journal.searchPlaceholder')}
        />
      </div>
      <div className="wbn-journal-filters" aria-label={t('journal.filters')}>
        {(['all', 'mutation', 'activity', 'system'] as const).map((candidate) => (
          <motion.button
            className={candidate === filter ? 'wbn-journal-filter-active' : undefined}
            type="button"
            key={candidate}
            onClick={() => setFilter(candidate)}
            whileTap={{ scale: 0.94 }}
          >
            {t(`journal.filter.${candidate}`)}
          </motion.button>
        ))}
      </div>
      <div className="wbn-journal-events">
        {visibleEvents.length ? (
          visibleEvents.map((event) => {
            const date = new Date(event.timestamp);
            const dateKey = date.toDateString();
            const showDate = dateKey !== previousDateKey;
            previousDateKey = dateKey;
            const canLocate = Boolean(
              (event.target?.boxId &&
                snapshot.boxes.some((box) => box.id === event.target?.boxId)) ||
              (event.target?.pageId &&
                snapshot.pages.some((page) => page.id === event.target?.pageId)),
            );
            return (
              <div className="wbn-journal-event-block" key={event.id}>
                {showDate ? (
                  <div className="wbn-journal-date">{formatDateHeading(date, locale, t)}</div>
                ) : null}
                <motion.button
                  className="wbn-journal-event"
                  type="button"
                  disabled={!canLocate}
                  onClick={() => locateEvent(event)}
                  whileTap={canLocate ? { scale: 0.985 } : undefined}
                >
                  <span className={`wbn-journal-event-icon wbn-journal-${event.category}`}>
                    <CategoryIcon category={event.category} />
                  </span>
                  <span className="wbn-journal-event-copy">
                    <span>
                      <strong>{getActionLabel(event.action, t)}</strong>
                      {event.undoable ? <small>{t('journal.undoable')}</small> : null}
                    </span>
                    <span>{getTargetLabel(event) || t(`journal.source.${event.source}`)}</span>
                    <time>{formatEventTime(date, locale)}</time>
                  </span>
                  {canLocate ? <ChevronRight size={14} /> : null}
                </motion.button>
              </div>
            );
          })
        ) : (
          <div className="wbn-journal-empty">
            <Database size={20} />
            <span>{query || filter !== 'all' ? t('journal.noMatches') : t('journal.empty')}</span>
          </div>
        )}
      </div>
      <footer className="wbn-journal-footer">
        {confirmClear ? (
          <>
            <span>{t('journal.clearQuestion')}</span>
            <motion.button
              type="button"
              onClick={() => setConfirmClear(false)}
              whileTap={{ scale: 0.94 }}
            >
              {t('common.cancel')}
            </motion.button>
            <motion.button
              className="wbn-journal-clear-confirm"
              type="button"
              onClick={() => {
                clear();
                setConfirmClear(false);
              }}
              whileTap={{ scale: 0.94 }}
            >
              {t('common.delete')}
            </motion.button>
          </>
        ) : (
          <>
            <motion.button
              type="button"
              onClick={exportEvents}
              disabled={!events.length}
              whileTap={{ scale: 0.94 }}
            >
              <Download size={14} />
              <span>{t('journal.export')}</span>
            </motion.button>
            <motion.button
              type="button"
              onClick={() => setConfirmClear(true)}
              disabled={!events.length}
              whileTap={{ scale: 0.94 }}
            >
              <Trash2 size={14} />
              <span>{t('journal.clear')}</span>
            </motion.button>
          </>
        )}
      </footer>
    </div>
  );
}

function CategoryIcon({ category }: { category: OperationCategory }) {
  if (category === 'activity') return <Activity size={15} />;
  if (category === 'system') return <Database size={15} />;
  return <Clock3 size={15} />;
}

function getTargetLabel(event: OperationEvent) {
  return event.target?.itemTitle || event.target?.boxTitle || event.target?.pageTitle || '';
}

function formatEventTime(date: Date, language: string) {
  return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatDateHeading(date: Date, language: string, t: ReturnType<typeof useI18n>['t']) {
  const today = new Date();
  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const difference = Math.round((todayDay - targetDay) / (24 * 60 * 60 * 1000));
  if (difference === 0) return t('journal.today');
  if (difference === 1) return t('journal.yesterday');
  return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  }).format(date);
}

function getActionLabel(action: string, t: ReturnType<typeof useI18n>['t']) {
  const key = ACTION_MESSAGE_KEYS[action];
  return key ? t(key) : action;
}

const ACTION_MESSAGE_KEYS: Record<string, Parameters<ReturnType<typeof useI18n>['t']>[0]> = {
  'workspace.import': 'journal.action.workspaceImport',
  'page.create': 'journal.action.pageCreate',
  'page.rename': 'journal.action.pageRename',
  'page.delete': 'journal.action.pageDelete',
  'page.reorder': 'journal.action.pageReorder',
  'box.create': 'journal.action.boxCreate',
  'box.temporary.create': 'journal.action.temporaryBoxCreate',
  'box.move': 'journal.action.boxMove',
  'box.resize': 'journal.action.boxResize',
  'box.rename': 'journal.action.boxRename',
  'box.promote': 'journal.action.boxPromote',
  'box.setDetailMode': 'journal.action.boxDetailMode',
  'box.setLocked': 'journal.action.boxLocked',
  'box.setAppearance': 'journal.action.boxAppearance',
  'box.setPreset': 'journal.action.boxPreset',
  'box.setViewMode': 'journal.action.boxViewMode',
  'box.moveToPage': 'journal.action.boxMoveToPage',
  'box.collect': 'journal.action.boxCollect',
  'box.removeFromCollection': 'journal.action.boxRemoveCollection',
  'box.delete': 'journal.action.boxDelete',
  'item.create': 'journal.action.itemCreate',
  'item.rename': 'journal.action.itemRename',
  'item.editContent': 'journal.action.itemEdit',
  'item.setPinned': 'journal.action.itemPinned',
  'item.reorder': 'journal.action.itemReorder',
  'item.moveBetweenBoxes': 'journal.action.itemMove',
  'item.delete': 'journal.action.itemDelete',
  'canvas.arrange': 'journal.action.canvasArrange',
  'canvas.constrainFrames': 'journal.action.canvasConstrain',
  'history.undo': 'journal.action.undo',
  'history.redo': 'journal.action.redo',
  'page.open': 'journal.action.pageOpen',
  'box.preview': 'journal.action.boxPreview',
  'item.open': 'journal.action.itemOpen',
  'item.copy': 'journal.action.itemCopy',
  'journal.export': 'journal.action.journalExport',
};

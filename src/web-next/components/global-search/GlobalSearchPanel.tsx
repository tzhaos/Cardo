import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { AppWindow, Box, Clipboard, File, Folder, Globe, PanelTop, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { useCanvasStore } from '../../app/stores/canvasStore';
import { useUiStore } from '../../app/stores/uiStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { searchWorkspace, type GlobalSearchResult } from '../../domain/globalSearch';
import type { BoxItem } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';
import {
  openExternalUrl,
  openLocalResource,
  writeClipboardText,
} from '../../platform/hostPlatform';
import { recordBoxActivity, recordItemActivity } from '../../app/operationActivity';

export function GlobalSearchPanel({
  query,
  onClose,
  rootRef,
}: {
  query: string;
  onClose: () => void;
  rootRef: RefObject<HTMLDivElement | null>;
}) {
  const snapshot = useWorkspaceStore((state) => state.snapshot);
  const setActivePage = useWorkspaceStore((state) => state.setActivePage);
  const selectBox = useUiStore((state) => state.selectBox);
  const highlightBox = useUiStore((state) => state.highlightBox);
  const focusFrame = useCanvasStore((state) => state.focusFrame);
  const results = useMemo(() => searchWorkspace(snapshot, query), [query, snapshot]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedResultId, setCopiedResultId] = useState<string | null>(null);
  const copiedTimeoutRef = useRef<number | null>(null);
  const { t } = useI18n();

  useEffect(() => setSelectedIndex(0), [query]);
  useEffect(
    () => () => {
      if (copiedTimeoutRef.current !== null) window.clearTimeout(copiedTimeoutRef.current);
    },
    [],
  );

  const activateResult = async (result: GlobalSearchResult) => {
    if (result.kind === 'page') {
      setActivePage(result.page.id, 'search');
      selectBox(null);
      onClose();
      return;
    }
    if (result.kind === 'box') {
      recordBoxActivity(result.box.id, 'box.open', { origin: 'search' });
      setActivePage(result.page.id, 'search');
      focusFrame(result.page.id, result.box.frame);
      selectBox(result.box.id);
      highlightBox(result.box.id);
      onClose();
      return;
    }
    await activateItem(result.item, result.id, result.box.id);
  };

  const activateItem = async (item: BoxItem, resultId: string, boxId: string) => {
    try {
      if (item.type === 'clipboard') {
        await writeClipboardText(item.text);
        recordItemActivity(boxId, item, 'item.copy', 'search');
        setCopiedResultId(resultId);
        if (copiedTimeoutRef.current !== null) window.clearTimeout(copiedTimeoutRef.current);
        copiedTimeoutRef.current = window.setTimeout(() => setCopiedResultId(null), 1200);
        return;
      }
      if (item.type === 'bookmark') {
        openExternalUrl(item.url);
        recordItemActivity(boxId, item, 'item.open', 'search');
      } else {
        await openLocalResource(item.path);
        recordItemActivity(boxId, item, 'item.open', 'search');
      }
      onClose();
    } catch {
      return;
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (!results.length) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((current) => {
          const delta = event.key === 'ArrowDown' ? 1 : -1;
          return (current + delta + results.length) % results.length;
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div ref={rootRef} className="wbn-global-search-panel-wrap">
      <motion.div
        className="wbn-global-search-panel"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.985 }}
        transition={{ duration: 0.16 }}
      >
        {!query.trim() ? (
          <div className="wbn-global-search-empty">
            <Search size={20} />
            <span>{t('search.globalHint')}</span>
          </div>
        ) : results.length ? (
          <div className="wbn-global-search-results" role="listbox">
            {results.map((result, index) => (
              <button
                className={`wbn-global-search-result${index === selectedIndex ? ' wbn-global-search-result-active' : ''}`}
                type="button"
                role="option"
                aria-selected={index === selectedIndex}
                key={result.id}
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={() => void activateResult(result)}
              >
                <ResultIcon result={result} />
                <span className="wbn-global-search-copy">
                  <span className="wbn-global-search-title">
                    {copiedResultId === result.id ? t('item.copied') : result.title}
                  </span>
                  <span className="wbn-global-search-path">{result.path}</span>
                  {result.detail ? (
                    <span className="wbn-global-search-detail">
                      {result.kind === 'box'
                        ? t('search.itemCount', { count: result.box.items.length })
                        : result.detail}
                    </span>
                  ) : null}
                </span>
                <span className="wbn-global-search-kind">{t(`search.kind.${result.kind}`)}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="wbn-global-search-empty">
            <Search size={20} />
            <span>{t('search.noGlobalResults')}</span>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function ResultIcon({ result }: { result: GlobalSearchResult }) {
  if (result.kind === 'page') return <PanelTop size={17} />;
  if (result.kind === 'box') return <Box size={17} />;
  return <ItemTypeIcon item={result.item} />;
}

function ItemTypeIcon({ item }: { item: BoxItem }) {
  switch (item.type) {
    case 'folder':
      return <Folder size={17} />;
    case 'file':
      return <File size={17} />;
    case 'shortcut':
      return <AppWindow size={17} />;
    case 'bookmark':
      return item.favicon ? (
        <img className="wbn-website-icon" src={item.favicon} alt="" />
      ) : (
        <Globe size={17} />
      );
    case 'clipboard':
      return <Clipboard size={17} />;
  }
}

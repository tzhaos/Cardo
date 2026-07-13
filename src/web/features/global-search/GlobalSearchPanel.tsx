import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import type { GlobalSearchResult } from '../../../core/contracts/globalSearch';
import { recordBoxActivity, recordItemActivity } from '../../app/operationActivity';
import { useCanvasStore } from '../../app/stores/canvasStore';
import { useUiStore } from '../../app/stores/uiStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import type { BoxItem } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';
import { ThemeIcon } from '../../kit/icon';
import { Button } from '../../kit/button';
import {
  openExternalUrl,
  openLocalResource,
  queryGlobalSearch,
  writeClipboardText,
} from '../../platform/hostPlatform';

/**
 * Local workspace search results body for SearchPage.
 * No web/engine search — groups, boxes, and items only.
 */
export function GlobalSearchPanel({
  query,
  onActivate,
}: {
  query: string;
  /** Called after a result is activated (e.g. close search page). */
  onActivate?: () => void;
}) {
  const setActivePage = useWorkspaceStore((state) => state.setActivePage);
  const selectBox = useUiStore((state) => state.selectBox);
  const highlightBox = useUiStore((state) => state.highlightBox);
  const focusFrame = useCanvasStore((state) => state.focusFrame);
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedResultId, setCopiedResultId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const copiedTimeoutRef = useRef<number | null>(null);
  const resultsRef = useRef(results);
  const selectedIndexRef = useRef(selectedIndex);
  const onActivateRef = useRef(onActivate);
  resultsRef.current = results;
  selectedIndexRef.current = selectedIndex;
  onActivateRef.current = onActivate;
  const { t } = useI18n();

  useEffect(() => setSelectedIndex(0), [query]);
  // Debounce Runtime search: every keystroke without delay floods SQLite + the client task queue.
  useEffect(() => {
    let active = true;
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setPending(false);
      return () => {
        active = false;
      };
    }
    setPending(true);
    const timer = window.setTimeout(() => {
      void queryGlobalSearch(trimmed)
        .then((nextResults) => {
          if (active) {
            setResults(nextResults);
            setPending(false);
          }
        })
        .catch((error: unknown) => {
          if (active) {
            console.error('Global search failed', error);
            setResults([]);
            setPending(false);
          }
        });
    }, 200);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);
  useEffect(
    () => () => {
      if (copiedTimeoutRef.current !== null) window.clearTimeout(copiedTimeoutRef.current);
    },
    [],
  );

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
    } catch {
      return;
    }
  };

  const activateResult = async (result: GlobalSearchResult) => {
    if (result.kind === 'page') {
      setActivePage(result.page.id, 'search');
      selectBox(null);
      onActivateRef.current?.();
      return;
    }
    if (result.kind === 'box') {
      recordBoxActivity(result.box.id, 'box.open', { origin: 'search' });
      setActivePage(result.page.id, 'search');
      focusFrame(result.page.id, result.box.frame);
      selectBox(result.box.id);
      highlightBox(result.box.id);
      onActivateRef.current?.();
      return;
    }
    await activateItem(result.item, result.id, result.box.id);
    // Keep page open for clipboard copy feedback; navigate types already close above.
    if (result.item.type !== 'clipboard') {
      onActivateRef.current?.();
    }
  };

  const activateResultRef = useRef(activateResult);
  activateResultRef.current = activateResult;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const list = resultsRef.current;
      if (!list.length) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((current) => {
          const delta = event.key === 'ArrowDown' ? 1 : -1;
          return (current + delta + list.length) % list.length;
        });
        return;
      }
      if (event.key === 'Enter') {
        const target = list[selectedIndexRef.current];
        if (!target) return;
        event.preventDefault();
        void activateResultRef.current(target);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="cardo-global-search-panel-wrap">
      <motion.div
        className="cardo-global-search-panel"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16 }}
      >
        {results.length ? (
          <div className="cardo-global-search-results" role="listbox">
            {results.map((result, index) => (
              <Button
                variant="ghost"
                className={`cardo-global-search-result${index === selectedIndex ? ' cardo-global-search-result-active' : ''}`}
                type="button"
                role="option"
                aria-selected={index === selectedIndex}
                key={result.id}
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={() => void activateResult(result)}
              >
                <ResultIcon result={result} />
                <span className="cardo-global-search-copy">
                  <span className="cardo-global-search-title">
                    {copiedResultId === result.id ? t('item.copied') : result.title}
                  </span>
                  <span className="cardo-global-search-path">{result.path}</span>
                  {result.detail ? (
                    <span className="cardo-global-search-detail">
                      {result.kind === 'box'
                        ? t('search.itemCount', { count: result.box.itemCount })
                        : result.detail}
                    </span>
                  ) : null}
                </span>
                <span className="cardo-global-search-kind">{t(`search.kind.${result.kind}`)}</span>
              </Button>
            ))}
          </div>
        ) : (
          <div className="cardo-global-search-empty">
            <ThemeIcon name="search" size={20} />
            <span>{pending ? t('shell.searchPlaceholder') : t('search.noGlobalResults')}</span>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function ResultIcon({ result }: { result: GlobalSearchResult }) {
  if (result.kind === 'page') return <ThemeIcon name="panel" size={17} />;
  if (result.kind === 'box') return <ThemeIcon name="box" size={17} />;
  return <ItemTypeIcon item={result.item} />;
}

function ItemTypeIcon({ item }: { item: BoxItem }) {
  switch (item.type) {
    case 'folder':
      return <ThemeIcon name="folder" size={17} />;
    case 'file':
      return <ThemeIcon name="document" size={17} />;
    case 'shortcut':
      return <ThemeIcon name="apps" size={17} />;
    case 'bookmark':
      return item.favicon ? (
        <img className="cardo-website-icon" src={item.favicon} alt="" />
      ) : (
        <ThemeIcon name="globe" size={17} />
      );
    case 'clipboard':
      return <ThemeIcon name="clipboard" size={17} />;
  }
}

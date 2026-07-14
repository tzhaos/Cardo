import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import type { GlobalSearchResult } from '../../../core/contracts/globalSearch';
import { recordBoxActivity, recordItemActivity } from '../../app/operationActivity';
import { useCanvasStore } from '../../app/stores/canvasStore';
import { showToast } from '../../app/stores/toastStore';
import { usePreferencesStore } from '../../app/stores/preferencesStore';
import { useUiStore } from '../../app/stores/uiStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { createWebSearchUrl } from '../../domain/webSearch';
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
 * Also offers a web-search action using preferences search engine.
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
  const markCreated = useUiStore((state) => state.markCreated);
  const focusFrame = useCanvasStore((state) => state.focusFrame);
  const searchEngine = usePreferencesStore((state) => state.searchEngine);
  const customSearchTemplate = usePreferencesStore((state) => state.customSearchTemplate);
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const resultsRef = useRef(results);
  const selectedIndexRef = useRef(selectedIndex);
  const onActivateRef = useRef(onActivate);
  resultsRef.current = results;
  selectedIndexRef.current = selectedIndex;
  onActivateRef.current = onActivate;
  const { t } = useI18n();
  const trimmedQuery = query.trim();
  const webSearchUrl = createWebSearchUrl(searchEngine, customSearchTemplate, trimmedQuery);

  useEffect(() => setSelectedIndex(0), [query]);
  // Debounce Runtime search: every keystroke without delay floods SQLite + the client task queue.
  useEffect(() => {
    let active = true;
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setPending(false);
      setSearchError(false);
      return () => {
        active = false;
      };
    }
    setPending(true);
    setSearchError(false);
    const timer = window.setTimeout(() => {
      void queryGlobalSearch(trimmed)
        .then((nextResults) => {
          if (active) {
            setResults(nextResults);
            setPending(false);
            setSearchError(false);
          }
        })
        .catch((error: unknown) => {
          if (active) {
            console.error('Global search failed', error);
            setResults([]);
            setPending(false);
            setSearchError(true);
            showToast(t('toast.searchFailed'), 'error');
          }
        });
    }, 200);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, retryToken, t]);

  const scrollSearchTargetIntoView = (boxId: string, itemId?: string) => {
    // Managed views (waterfall/list) may not finish paint on the same tick as page switch.
    // SearchPage replaces WorkspaceCanvas, so retry after the swap paints.
    const run = () => {
      document
        .querySelector(`[data-box-id="${CSS.escape(boxId)}"]`)
        ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      if (itemId) {
        document
          .querySelector(`[data-item-id="${CSS.escape(itemId)}"]`)
          ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    };
    window.requestAnimationFrame(() => {
      window.setTimeout(run, 0);
      window.setTimeout(run, 50);
    });
  };

  const locateItemResult = (result: Extract<GlobalSearchResult, { kind: 'item' }>) => {
    setActivePage(result.page.id, 'search');
    focusFrame(result.page.id, result.box.frame);
    selectBox(result.box.id);
    highlightBox(result.box.id);
    markCreated(result.box.id, result.item.id);
    scrollSearchTargetIntoView(result.box.id, result.item.id);
  };

  const activateItem = async (item: BoxItem, boxId: string) => {
    try {
      if (item.type === 'clipboard') {
        await writeClipboardText(item.text);
        recordItemActivity(boxId, item, 'item.copy', 'search');
        showToast(t('toast.copied'), 'success');
        return true;
      }
      if (item.type === 'bookmark') {
        openExternalUrl(item.url);
        recordItemActivity(boxId, item, 'item.open', 'search');
        return true;
      }
      const openResult = await openLocalResource(item.path);
      if (openResult.status === 'failed') {
        showToast(t('toast.openFailed'), 'error');
        return false;
      }
      recordItemActivity(boxId, item, 'item.open', 'search');
      return true;
    } catch {
      if (item.type === 'clipboard') showToast(t('toast.copyFailed'), 'error');
      else showToast(t('toast.openFailed'), 'error');
      return false;
    }
  };

  const openWebSearch = () => {
    if (!webSearchUrl) {
      showToast(t('toast.webSearchUnavailable'), 'error');
      return;
    }
    openExternalUrl(webSearchUrl);
    onActivateRef.current?.();
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
      scrollSearchTargetIntoView(result.box.id);
      onActivateRef.current?.();
      return;
    }
    locateItemResult(result);
    const ok = await activateItem(result.item, result.box.id);
    // Keep page open for clipboard copy feedback; navigate types close after action.
    if (result.item.type === 'clipboard') return;
    if (ok) onActivateRef.current?.();
  };

  const activateResultRef = useRef(activateResult);
  activateResultRef.current = activateResult;
  const openWebSearchRef = useRef(openWebSearch);
  openWebSearchRef.current = openWebSearch;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const list = resultsRef.current;
      const hasWeb = Boolean(trimmedQuery);
      // Result list + optional web-search row as last virtual index when list empty or as extra.
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (!list.length && !hasWeb) return;
        event.preventDefault();
        const max = list.length; // web row index when hasWeb is list.length
        const bound = hasWeb ? max : Math.max(0, max - 1);
        setSelectedIndex((current) => {
          const delta = event.key === 'ArrowDown' ? 1 : -1;
          if (!list.length && hasWeb) return 0;
          const next = current + delta;
          if (hasWeb) {
            if (next < 0) return bound;
            if (next > bound) return 0;
            return next;
          }
          return (current + delta + list.length) % list.length;
        });
        return;
      }
      if (event.key === 'Enter') {
        const index = selectedIndexRef.current;
        if (list.length && index >= 0 && index < list.length) {
          const target = list[index];
          if (!target) return;
          event.preventDefault();
          void activateResultRef.current(target);
          return;
        }
        if (hasWeb && (index === list.length || !list.length)) {
          event.preventDefault();
          openWebSearchRef.current();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [trimmedQuery]);

  const webRowSelected =
    selectedIndex === results.length || (results.length === 0 && selectedIndex === 0);

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
                  <span className="cardo-global-search-title">{result.title}</span>
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
            {trimmedQuery ? (
              <Button
                variant="ghost"
                className={`cardo-global-search-result cardo-global-search-web${webRowSelected ? ' cardo-global-search-result-active' : ''}`}
                type="button"
                role="option"
                aria-selected={webRowSelected}
                onMouseEnter={() => setSelectedIndex(results.length)}
                onClick={openWebSearch}
              >
                <ThemeIcon name="globe" size={17} />
                <span className="cardo-global-search-copy">
                  <span className="cardo-global-search-title">
                    {t('search.webFor', { query: trimmedQuery })}
                  </span>
                  <span className="cardo-global-search-path">{t('search.web')}</span>
                </span>
                <span className="cardo-global-search-kind">{t('search.web')}</span>
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="cardo-global-search-empty-stack">
            <div className="cardo-global-search-empty">
              <ThemeIcon name="search" size={20} />
              <span>
                {pending
                  ? t('search.pending')
                  : searchError
                    ? t('search.failed')
                    : t('search.noGlobalResults')}
              </span>
              {searchError && !pending ? (
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setRetryToken((token) => token + 1)}
                >
                  {t('common.retry')}
                </Button>
              ) : null}
            </div>
            {trimmedQuery ? (
              <Button
                variant="ghost"
                className={`cardo-global-search-result cardo-global-search-web${webRowSelected ? ' cardo-global-search-result-active' : ''}`}
                type="button"
                onClick={openWebSearch}
              >
                <ThemeIcon name="globe" size={17} />
                <span className="cardo-global-search-copy">
                  <span className="cardo-global-search-title">
                    {t('search.webFor', { query: trimmedQuery })}
                  </span>
                  <span className="cardo-global-search-path">{t('search.web')}</span>
                </span>
                <span className="cardo-global-search-kind">{t('search.web')}</span>
              </Button>
            ) : null}
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

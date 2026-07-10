import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import {
  AppWindow,
  Box,
  Clipboard,
  Copy,
  ExternalLink,
  File,
  Folder,
  Globe2,
  PanelTop,
  Search,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useUiStore } from '../../app/stores/uiStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { getBoxAccent, getBoxIcon } from '../../domain/boxAppearance';
import {
  getItemDetail,
  getItemResultTitle,
  searchWorkspace,
  type GlobalSearchResult,
} from '../../domain/globalSearch';
import type { BoxItem, WorkspaceBox } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';
import {
  openExternalUrl,
  openLocalResource,
  writeClipboardText,
} from '../../platform/hostPlatform';
import { BoxAppearanceIcon } from '../boxes/boxIconRegistry';
import { recordBoxActivity, recordItemActivity } from '../../app/operationActivity';

export function GlobalSearchPanel({ query, onClose }: { query: string; onClose: () => void }) {
  const snapshot = useWorkspaceStore((state) => state.snapshot);
  const setActivePage = useWorkspaceStore((state) => state.setActivePage);
  const selectBox = useUiStore((state) => state.selectBox);
  const results = useMemo(() => searchWorkspace(snapshot, query), [query, snapshot]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [previewBoxId, setPreviewBoxId] = useState<string | null>(null);
  const [copiedResultId, setCopiedResultId] = useState<string | null>(null);
  const copiedTimeoutRef = useRef<number | null>(null);
  const { t } = useI18n();
  const previewBox = snapshot.boxes.find((box) => box.id === previewBoxId) ?? null;
  const previewPage = previewBox
    ? snapshot.pages.find((page) => page.id === previewBox.pageId)
    : null;

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
      recordBoxActivity(result.box.id, 'box.preview', { origin: 'search' });
      setPreviewBoxId(result.box.id);
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
        if (previewBoxId) setPreviewBoxId(null);
        else onClose();
        return;
      }
      if (!results.length || previewBoxId) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((current) => {
          const delta = event.key === 'ArrowDown' ? 1 : -1;
          return (current + delta + results.length) % results.length;
        });
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const result = results[selectedIndex];
        if (result) void activateResult(result);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <>
      <div className="wbn-global-search-panel-wrap">
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
      {previewBox && previewPage ? (
        <ReadonlyBoxPreview
          box={previewBox}
          pageTitle={previewPage.title}
          onClose={() => setPreviewBoxId(null)}
          onActivateItem={(item) => void activateItem(item, `preview:${item.id}`, previewBox.id)}
          copiedItemId={copiedResultId}
        />
      ) : null}
    </>
  );
}

function ResultIcon({ result }: { result: GlobalSearchResult }) {
  if (result.kind === 'page') return <PanelTop size={17} />;
  if (result.kind === 'box') return <Box size={17} />;
  return <ItemTypeIcon item={result.item} />;
}

function ReadonlyBoxPreview({
  box,
  pageTitle,
  onClose,
  onActivateItem,
  copiedItemId,
}: {
  box: WorkspaceBox;
  pageTitle: string;
  onClose: () => void;
  onActivateItem: (item: BoxItem) => void;
  copiedItemId: string | null;
}) {
  const { t } = useI18n();
  const accent = getBoxAccent(box);
  return createPortal(
    <motion.div
      className="wbn-readonly-box-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onPointerDown={onClose}
    >
      <motion.section
        className={`wbn-readonly-box-preview${box.viewMode === 'grid' ? ' wbn-readonly-box-grid' : ''}${box.detailMode === 'compact' ? ' wbn-readonly-box-compact' : ''}`}
        style={{ '--box-accent': accent } as CSSProperties}
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        onPointerDown={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.preventDefault()}
      >
        <header>
          <span className="wbn-readonly-box-icon">
            <BoxAppearanceIcon icon={getBoxIcon(box)} size={17} />
          </span>
          <span className="wbn-readonly-box-heading">
            <strong>{box.title}</strong>
            <small>{`${pageTitle} / ${box.title}`}</small>
          </span>
          <span className="wbn-readonly-badge">{t('search.readOnly')}</span>
          <button type="button" onClick={onClose} aria-label={t('common.close')}>
            <X size={16} />
          </button>
        </header>
        <div className="wbn-readonly-box-items">
          {box.items.length ? (
            box.items.map((item) => (
              <button type="button" key={item.id} onClick={() => onActivateItem(item)}>
                <span className="wbn-readonly-item-icon">
                  <ItemTypeIcon item={item} />
                </span>
                <span>
                  <strong>
                    {copiedItemId === `preview:${item.id}`
                      ? t('item.copied')
                      : getItemResultTitle(item)}
                  </strong>
                  <small>{getItemDetail(item)}</small>
                </span>
                {item.type === 'clipboard' ? <Copy size={14} /> : <ExternalLink size={14} />}
              </button>
            ))
          ) : (
            <div className="wbn-readonly-box-empty">{t('box.empty')}</div>
          )}
        </div>
      </motion.section>
    </motion.div>,
    document.body,
  );
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
      return <Globe2 size={17} />;
    case 'clipboard':
      return <Clipboard size={17} />;
  }
}

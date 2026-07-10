import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import {
  AppWindow,
  ChevronsDownUp,
  ChevronsUpDown,
  Clipboard,
  Copy,
  ExternalLink,
  File,
  Folder,
  Globe,
  LayoutGrid,
  List,
  LocateFixed,
  Star,
  StarOff,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, useMotionValue } from 'motion/react';
import { useCanvasStore } from '../../app/stores/canvasStore';
import { useUiStore } from '../../app/stores/uiStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import {
  startWindowPointerSession,
  type WindowPointerSession,
} from '../../app/windowPointerSession';
import { recordItemActivity } from '../../app/operationActivity';
import { getBoxAccent, getBoxIcon } from '../../domain/boxAppearance';
import { getItemDetail, getItemResultTitle } from '../../domain/globalSearch';
import {
  isRecycleBinPageId,
  type BoxFrame,
  type BoxItem,
  type CollectionBoxView,
  type WorkspaceBox,
} from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';
import {
  openExternalUrl,
  openLocalResource,
  writeClipboardText,
} from '../../platform/hostPlatform';
import { BoxAppearanceIcon } from '../boxes/boxIconRegistry';
import { useFloatingMenu } from '../floating-menu/useFloatingMenu';

export function CollectionPage() {
  const snapshot = useWorkspaceStore((state) => state.snapshot);
  const removeBoxFromCollection = useWorkspaceStore((state) => state.removeBoxFromCollection);
  const updateCollectionBoxFrame = useWorkspaceStore((state) => state.updateCollectionBoxFrame);
  const updateCollectionBoxView = useWorkspaceStore((state) => state.updateCollectionBoxView);
  const setActivePage = useWorkspaceStore((state) => state.setActivePage);
  const viewport = useCanvasStore((state) => state.viewportSize);
  const focusFrame = useCanvasStore((state) => state.focusFrame);
  const selectBox = useUiStore((state) => state.selectBox);
  const highlightBox = useUiStore((state) => state.highlightBox);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const copiedTimeoutRef = useRef<number | null>(null);
  const { openMenu } = useFloatingMenu();
  const { t } = useI18n();
  const pagesById = useMemo(
    () => new Map(snapshot.pages.map((page) => [page.id, page])),
    [snapshot.pages],
  );
  const boxesById = useMemo(
    () => new Map(snapshot.boxes.map((box) => [box.id, box])),
    [snapshot.boxes],
  );
  const entries = (snapshot.collectionBoxIds ?? [])
    .map((boxId, index) => {
      const box = boxesById.get(boxId);
      if (!box || isRecycleBinPageId(box.pageId)) return null;
      return {
        box,
        view: snapshot.collectionViews?.[boxId] ?? createFallbackView(box, index),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((first, second) => first.view.order - second.view.order);

  useEffect(
    () => () => {
      if (copiedTimeoutRef.current !== null) window.clearTimeout(copiedTimeoutRef.current);
    },
    [],
  );

  const activateItem = async (boxId: string, item: BoxItem) => {
    try {
      if (item.type === 'clipboard') {
        await writeClipboardText(item.text);
        recordItemActivity(boxId, item, 'item.copy', 'collection');
        const key = `${boxId}:${item.id}`;
        setCopiedItemId(key);
        if (copiedTimeoutRef.current !== null) window.clearTimeout(copiedTimeoutRef.current);
        copiedTimeoutRef.current = window.setTimeout(() => setCopiedItemId(null), 1200);
        return;
      }
      if (item.type === 'bookmark') {
        openExternalUrl(item.url);
        recordItemActivity(boxId, item, 'item.open', 'collection');
      } else {
        await openLocalResource(item.path);
        recordItemActivity(boxId, item, 'item.open', 'collection');
      }
    } catch {
      return;
    }
  };

  const locateSource = (box: WorkspaceBox) => {
    setActivePage(box.pageId, 'collection');
    focusFrame(box.pageId, box.frame);
    selectBox(box.id);
    highlightBox(box.id);
  };

  return (
    <section className="wbn-collection-page" onContextMenu={(event) => event.preventDefault()}>
      <AnimatePresence>
        {entries.length ? (
          entries.map(({ box, view }) => (
            <CollectionBox
              box={box}
              key={box.id}
              pageTitle={pagesById.get(box.pageId)?.title ?? ''}
              view={view}
              viewport={viewport}
              copiedItemId={copiedItemId}
              maxOrder={entries.at(-1)?.view.order ?? 0}
              onActivateItem={(item) => void activateItem(box.id, item)}
              onFrameChange={(frame) => updateCollectionBoxFrame(box.id, frame)}
              onViewChange={(patch) => updateCollectionBoxView(box.id, patch)}
              onLocate={() => locateSource(box)}
              onRemove={() => removeBoxFromCollection(box.id)}
              onOpenMenu={(event) => {
                event.preventDefault();
                openMenu({
                  id: `collection-box-${box.id}`,
                  x: event.clientX,
                  y: event.clientY,
                  items: [
                    {
                      id: 'view-mode',
                      label: t(view.viewMode === 'list' ? 'box.switchToGrid' : 'box.switchToList'),
                      icon:
                        view.viewMode === 'list' ? <LayoutGrid size={16} /> : <List size={16} />,
                      onSelect: () =>
                        updateCollectionBoxView(box.id, {
                          viewMode: view.viewMode === 'list' ? 'grid' : 'list',
                        }),
                    },
                    {
                      id: 'detail-mode',
                      label: t(
                        view.detailMode === 'detailed'
                          ? 'box.switchToCompact'
                          : 'box.switchToDetailed',
                      ),
                      icon:
                        view.detailMode === 'detailed' ? (
                          <ChevronsDownUp size={16} />
                        ) : (
                          <ChevronsUpDown size={16} />
                        ),
                      onSelect: () =>
                        updateCollectionBoxView(box.id, {
                          detailMode: view.detailMode === 'detailed' ? 'compact' : 'detailed',
                        }),
                    },
                    {
                      id: 'locate-source',
                      label: t('collection.locateSource'),
                      icon: <LocateFixed size={16} />,
                      onSelect: () => locateSource(box),
                    },
                    {
                      id: 'remove',
                      label: t('menu.removeFromCollection'),
                      icon: <StarOff size={16} />,
                      onSelect: () => removeBoxFromCollection(box.id),
                    },
                  ],
                });
              }}
              t={t}
            />
          ))
        ) : (
          <motion.div
            className="wbn-collection-empty"
            key="collection-empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            <Star size={24} />
            <strong>{t('collection.emptyTitle')}</strong>
            <span>{t('collection.emptyDescription')}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function CollectionBox({
  box,
  pageTitle,
  view,
  viewport,
  copiedItemId,
  maxOrder,
  onActivateItem,
  onFrameChange,
  onViewChange,
  onLocate,
  onRemove,
  onOpenMenu,
  t,
}: {
  box: WorkspaceBox;
  pageTitle: string;
  view: CollectionBoxView;
  viewport: { width: number; height: number };
  copiedItemId: string | null;
  maxOrder: number;
  onActivateItem: (item: BoxItem) => void;
  onFrameChange: (frame: BoxFrame) => void;
  onViewChange: (patch: {
    viewMode?: 'list' | 'grid';
    detailMode?: 'detailed' | 'compact';
    order?: number;
  }) => void;
  onLocate: () => void;
  onRemove: () => void;
  onOpenMenu: (event: ReactMouseEvent<HTMLElement>) => void;
  t: ReturnType<typeof useI18n>['t'];
}) {
  const left = useMotionValue(view.frame.x);
  const top = useMotionValue(view.frame.y);
  const width = useMotionValue(view.frame.width);
  const height = useMotionValue(view.frame.height);
  const sessionRef = useRef<WindowPointerSession | null>(null);
  const accent = getBoxAccent(box);

  useEffect(() => {
    left.set(view.frame.x);
    top.set(view.frame.y);
    width.set(view.frame.width);
    height.set(view.frame.height);
  }, [height, left, top, view.frame, width]);
  useEffect(() => () => sessionRef.current?.end(), []);

  const beginFrameChange = (event: ReactPointerEvent<HTMLElement>, mode: 'move' | 'resize') => {
    if (mode === 'move' && (event.target as Element).closest('button,[data-no-collection-drag]'))
      return;
    event.preventDefault();
    event.stopPropagation();
    sessionRef.current?.end();
    onViewChange({ order: maxOrder + 1 });
    const start = { x: event.clientX, y: event.clientY };
    const startFrame = view.frame;
    let latestFrame = startFrame;
    const session = startWindowPointerSession({
      pointerId: event.pointerId,
      onMove: (moveEvent) => {
        const dx = moveEvent.clientX - start.x;
        const dy = moveEvent.clientY - start.y;
        latestFrame = constrainCollectionFrame(
          mode === 'move'
            ? { ...startFrame, x: startFrame.x + dx, y: startFrame.y + dy }
            : {
                ...startFrame,
                width: Math.max(260, startFrame.width + dx),
                height: Math.max(190, startFrame.height + dy),
              },
          viewport,
        );
        left.set(latestFrame.x);
        top.set(latestFrame.y);
        width.set(latestFrame.width);
        height.set(latestFrame.height);
      },
      onEnd: () => {
        onFrameChange(latestFrame);
        if (sessionRef.current === session) sessionRef.current = null;
      },
    });
    sessionRef.current = session;
  };

  return (
    <motion.article
      className={`wbn-collection-box${view.viewMode === 'grid' ? ' wbn-collection-box-grid' : ''}${view.detailMode === 'compact' ? ' wbn-collection-box-compact' : ''}`}
      style={
        {
          '--box-accent': accent,
          left,
          top,
          width,
          height,
          zIndex: 10 + view.order,
        } as CSSProperties
      }
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      onContextMenu={onOpenMenu}
    >
      <header
        className="wbn-collection-box-header"
        onPointerDown={(event) => beginFrameChange(event, 'move')}
      >
        <span className="wbn-collection-box-grip" aria-hidden="true" />
        <button
          className="wbn-collection-box-icon"
          type="button"
          data-no-collection-drag
          onClick={onLocate}
          title={t('collection.locateSource')}
        >
          <BoxAppearanceIcon icon={getBoxIcon(box)} size={16} />
        </button>
        <span className="wbn-collection-box-heading">
          <strong>{box.title}</strong>
          <small>{pageTitle}</small>
        </span>
        <button
          type="button"
          data-no-collection-drag
          onClick={() =>
            onViewChange({ detailMode: view.detailMode === 'detailed' ? 'compact' : 'detailed' })
          }
          title={t(view.detailMode === 'detailed' ? 'box.switchToCompact' : 'box.switchToDetailed')}
        >
          {view.detailMode === 'detailed' ? (
            <ChevronsDownUp size={14} />
          ) : (
            <ChevronsUpDown size={14} />
          )}
        </button>
        <button
          type="button"
          data-no-collection-drag
          onClick={() => onViewChange({ viewMode: view.viewMode === 'list' ? 'grid' : 'list' })}
          title={t(view.viewMode === 'list' ? 'box.switchToGrid' : 'box.switchToList')}
        >
          {view.viewMode === 'list' ? <LayoutGrid size={14} /> : <List size={14} />}
        </button>
        <button
          className="wbn-collection-remove"
          type="button"
          data-no-collection-drag
          onClick={onRemove}
          aria-label={t('collection.remove', { title: box.title })}
          title={t('collection.remove', { title: box.title })}
        >
          <X size={14} />
        </button>
      </header>
      <div className="wbn-collection-box-items">
        {box.items.length ? (
          box.items.map((item) => (
            <button type="button" key={item.id} onClick={() => onActivateItem(item)}>
              <span className="wbn-collection-item-icon">
                <CollectionItemIcon item={item} />
              </span>
              <span>
                <strong>
                  {copiedItemId === `${box.id}:${item.id}`
                    ? t('item.copied')
                    : getItemResultTitle(item)}
                </strong>
                <small>{getItemDetail(item)}</small>
              </span>
              {item.type === 'clipboard' ? <Copy size={13} /> : <ExternalLink size={13} />}
            </button>
          ))
        ) : (
          <div className="wbn-collection-box-empty">{t('box.empty')}</div>
        )}
      </div>
      <button
        className="wbn-collection-resize"
        type="button"
        aria-label={t('box.resize', { title: box.title })}
        onPointerDown={(event) => beginFrameChange(event, 'resize')}
      >
        <span />
      </button>
    </motion.article>
  );
}

function constrainCollectionFrame(frame: BoxFrame, viewport: { width: number; height: number }) {
  const maxWidth = Math.max(260, viewport.width - 24);
  const maxHeight = Math.max(190, viewport.height - 140);
  const width = Math.min(frame.width, maxWidth);
  const height = Math.min(frame.height, maxHeight);
  return {
    x: Math.max(12, Math.min(frame.x, Math.max(12, viewport.width - width - 12))),
    y: Math.max(72, Math.min(frame.y, Math.max(72, viewport.height - height - 72))),
    width,
    height,
  };
}

function createFallbackView(box: WorkspaceBox, index: number): CollectionBoxView {
  return {
    boxId: box.id,
    frame: {
      x: 64 + (index % 3) * 350,
      y: 92 + Math.floor(index / 3) * 290,
      width: 320,
      height: 260,
    },
    viewMode: box.viewMode ?? 'list',
    detailMode: box.detailMode ?? 'detailed',
    order: index,
  };
}

function CollectionItemIcon({ item }: { item: BoxItem }) {
  switch (item.type) {
    case 'folder':
      return <Folder size={16} />;
    case 'file':
      return <File size={16} />;
    case 'shortcut':
      return <AppWindow size={16} />;
    case 'bookmark':
      return <Globe size={16} />;
    case 'clipboard':
      return <Clipboard size={16} />;
  }
}

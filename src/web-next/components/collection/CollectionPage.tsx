import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  AppWindow,
  Clipboard,
  Copy,
  ExternalLink,
  File,
  Folder,
  Globe,
  Star,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { getBoxAccent, getBoxIcon } from '../../domain/boxAppearance';
import { getItemDetail, getItemResultTitle } from '../../domain/globalSearch';
import { isRecycleBinPageId, type BoxItem } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';
import {
  openExternalUrl,
  openLocalResource,
  writeClipboardText,
} from '../../platform/hostPlatform';
import { BoxAppearanceIcon } from '../boxes/boxIconRegistry';
import { recordItemActivity } from '../../app/operationActivity';

export function CollectionPage() {
  const snapshot = useWorkspaceStore((state) => state.snapshot);
  const removeBoxFromCollection = useWorkspaceStore((state) => state.removeBoxFromCollection);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const copiedTimeoutRef = useRef<number | null>(null);
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
    .map((boxId) => boxesById.get(boxId))
    .filter((box): box is NonNullable<typeof box> =>
      Boolean(box && !isRecycleBinPageId(box.pageId)),
    );

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
        setCopiedItemId(item.id);
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

  return (
    <section className="wbn-collection-page" onContextMenu={(event) => event.preventDefault()}>
      <AnimatePresence mode="popLayout">
        {entries.length ? (
          <motion.div
            className="wbn-collection-grid"
            key="collection-grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            {entries.map((box) => {
              const page = pagesById.get(box.pageId);
              const accent = getBoxAccent(box);
              return (
                <motion.article
                  className={`wbn-collection-box${box.viewMode === 'grid' ? ' wbn-collection-box-grid' : ''}${box.detailMode === 'compact' ? ' wbn-collection-box-compact' : ''}`}
                  key={box.id}
                  layout="position"
                  style={{ '--box-accent': accent } as CSSProperties}
                  initial={{ opacity: 0, y: 14, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                >
                  <header className="wbn-collection-box-header">
                    <span className="wbn-collection-box-grip" aria-hidden="true" />
                    <span className="wbn-collection-box-icon">
                      <BoxAppearanceIcon icon={getBoxIcon(box)} size={16} />
                    </span>
                    <span className="wbn-collection-box-heading">
                      <strong>{box.title}</strong>
                      <small>{page?.title ?? ''}</small>
                    </span>
                    <span className="wbn-collection-readonly">{t('search.readOnly')}</span>
                    <button
                      type="button"
                      onClick={() => removeBoxFromCollection(box.id)}
                      aria-label={t('collection.remove', { title: box.title })}
                      title={t('collection.remove', { title: box.title })}
                    >
                      <X size={14} />
                    </button>
                  </header>
                  <div className="wbn-collection-box-items">
                    {box.items.length ? (
                      box.items.map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => void activateItem(box.id, item)}
                        >
                          <span className="wbn-collection-item-icon">
                            <CollectionItemIcon item={item} />
                          </span>
                          <span>
                            <strong>
                              {copiedItemId === item.id
                                ? t('item.copied')
                                : getItemResultTitle(item)}
                            </strong>
                            <small>{getItemDetail(item)}</small>
                          </span>
                          {item.type === 'clipboard' ? (
                            <Copy size={13} />
                          ) : (
                            <ExternalLink size={13} />
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="wbn-collection-box-empty">{t('box.empty')}</div>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
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

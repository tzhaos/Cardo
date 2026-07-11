import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { ClipboardItem as ClipboardItemModel } from '../../domain/workspace';
import { ItemDeleteView } from './ItemDeleteView';
import { ItemContentEditView } from './ItemContentEditView';
import { ItemActions } from './ItemActions';
import { useItemRename } from './useItemRename';
import { writeClipboardText } from '../../platform/hostPlatform';
import { useI18n } from '../../i18n/useI18n';
import { useItemContextMenu } from './useItemContextMenu';
import { recordItemActivity } from '../../app/operationActivity';

export function ClipboardItem({
  boxId,
  item,
  highlight,
}: {
  boxId: string;
  item: ClipboardItemModel;
  highlight: boolean;
}) {
  const rename = useItemRename(boxId, item.id, item.title);
  const [copied, setCopied] = useState(false);
  const [deleteView, setDeleteView] = useState(false);
  const [editView, setEditView] = useState(false);
  const copyResetRef = useRef<number | null>(null);
  const { t } = useI18n();

  useEffect(
    () => () => {
      if (copyResetRef.current !== null) {
        window.clearTimeout(copyResetRef.current);
      }
    },
    [],
  );

  const copyText = async () => {
    try {
      await writeClipboardText(item.text);
      recordItemActivity(boxId, item, 'item.copy');
      setCopied(true);
      if (copyResetRef.current !== null) {
        window.clearTimeout(copyResetRef.current);
      }
      copyResetRef.current = window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };
  const contextMenu = useItemContextMenu({
    pinned: Boolean(item.isPinned),
    primaryAction: {
      label: t('item.copy'),
      icon: <Copy size={16} />,
      onSelect: () => void copyText(),
    },
    onEdit: () => setEditView(true),
    onPin: () => rename.setPinned(!item.isPinned),
    onDelete: () => setDeleteView(true),
  });

  return (
    <div
      className={`wbn-item-row wbn-clipboard-item${item.isPinned ? ' wbn-item-pinned' : ''}${highlight ? ' wbn-item-new' : ''}${deleteView ? ' wbn-item-delete-state' : ''}${editView ? ' wbn-item-edit-state' : ''}`}
      title={!deleteView && !editView ? t('item.copy') : undefined}
      onContextMenu={contextMenu.onContextMenu}
      onClick={(event) => {
        if (
          deleteView ||
          editView ||
          (event.target instanceof Element &&
            event.target.closest('button,input,textarea,form,.wbn-item-drag-handle'))
        ) {
          return;
        }
        void copyText();
      }}
    >
      <AnimatePresence initial={false} mode="wait">
        {deleteView ? (
          <ItemDeleteView
            key="delete"
            onCancel={() => setDeleteView(false)}
            onConfirm={rename.deleteItem}
          />
        ) : editView ? (
          <ItemContentEditView
            key="edit"
            boxId={boxId}
            item={item}
            onCancel={() => setEditView(false)}
          />
        ) : (
          <motion.div
            className="wbn-item-view-content wbn-clipboard-card-content"
            key="content"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.15 }}
          >
            <p className="wbn-clipboard-body">{item.text}</p>
            <AnimatePresence>
              {copied ? (
                <motion.span
                  className="wbn-clipboard-copied"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.16 }}
                >
                  <Check size={15} />
                  <span>{t('item.copied')}</span>
                </motion.span>
              ) : null}
            </AnimatePresence>
            <ItemActions
              pinned={Boolean(item.isPinned)}
              onPin={() => rename.setPinned(!item.isPinned)}
              onEdit={() => setEditView(true)}
              onDelete={() => setDeleteView(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

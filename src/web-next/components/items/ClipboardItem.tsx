import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { ClipboardItem as ClipboardItemModel } from '../../domain/workspace';
import { ItemDeleteView } from './ItemDeleteView';
import { ItemActions } from './ItemActions';
import { useItemRename } from './useItemRename';
import { writeClipboardText } from '../../platform/hostPlatform';

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
  const copyResetRef = useRef<number | null>(null);

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
      setCopied(true);
      if (copyResetRef.current !== null) {
        window.clearTimeout(copyResetRef.current);
      }
      copyResetRef.current = window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className={`wbn-item-row wbn-clipboard-item${item.isPinned ? ' wbn-item-pinned' : ''}${highlight ? ' wbn-item-new' : ''}${deleteView ? ' wbn-item-delete-state' : ''}`}
    >
      <AnimatePresence initial={false} mode="wait">
        {deleteView ? (
          <ItemDeleteView
            key="delete"
            onCancel={() => setDeleteView(false)}
            onConfirm={rename.deleteItem}
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
            <ItemActions
              copied={copied}
              pinned={Boolean(item.isPinned)}
              onCopy={copyText}
              onPin={() => rename.setPinned(!item.isPinned)}
              onDelete={() => setDeleteView(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

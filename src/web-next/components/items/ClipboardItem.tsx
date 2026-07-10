import { useEffect, useRef, useState } from 'react';
import { Clipboard } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { ClipboardItem as ClipboardItemModel } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';
import { ItemDeleteView } from './ItemDeleteView';
import { ItemActions } from './ItemActions';
import { useItemRename } from './useItemRename';
import { writeClipboardText } from '../../platform/hostPlatform';
import { IconFrame } from '../primitives/IconPrimitives';

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
      className={`wbn-item-row wbn-clipboard-item${highlight ? ' wbn-item-new' : ''}${deleteView ? ' wbn-item-delete-state' : ''}`}
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
            className="wbn-item-view-content wbn-item-view-content-row"
            key="content"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.15 }}
          >
            <IconFrame className="wbn-item-glyph">
              <Clipboard size={16} />
            </IconFrame>
            <div className="wbn-item-main">
              {rename.renaming ? (
                <input
                  ref={rename.inputRef}
                  className="wbn-inline-rename wbn-item-title-input"
                  value={rename.draft}
                  onChange={(event) => rename.setDraft(event.target.value)}
                  onBlur={rename.commit}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur();
                    if (event.key === 'Escape') rename.cancel();
                  }}
                />
              ) : (
                <strong
                  className={item.title ? undefined : 'wbn-item-title-placeholder'}
                  onDoubleClick={rename.startRenaming}
                >
                  {item.title || t('item.untitled')}
                </strong>
              )}
              <p className="wbn-item-secondary wbn-clipboard-text">{item.text}</p>
            </div>
            <ItemActions
              copied={copied}
              onCopy={copyText}
              onEdit={rename.startRenaming}
              onDelete={() => setDeleteView(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

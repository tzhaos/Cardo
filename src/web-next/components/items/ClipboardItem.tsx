import { useEffect, useRef, useState } from 'react';
import type { ClipboardItem as ClipboardItemModel } from '../../domain/workspace';
import { ItemActions } from './ItemActions';
import { useItemRename } from './useItemRename';

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
      await navigator.clipboard.writeText(item.text);
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
    <div className={`wbn-clipboard-card${highlight ? ' wbn-item-new' : ''}`}>
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
      ) : item.title ? (
        <strong onDoubleClick={rename.startRenaming}>{item.title}</strong>
      ) : null}
      <p>{item.text}</p>
      <ItemActions
        copied={copied}
        onCopy={copyText}
        onEdit={rename.startRenaming}
        onDelete={rename.deleteItem}
      />
    </div>
  );
}

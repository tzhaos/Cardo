import { Bookmark } from 'lucide-react';
import type { BookmarkItem as BookmarkItemModel } from '../../domain/workspace';
import { ItemActions } from './ItemActions';
import { useItemRename } from './useItemRename';

export function BookmarkItem({
  boxId,
  item,
  highlight,
}: {
  boxId: string;
  item: BookmarkItemModel;
  highlight: boolean;
}) {
  const rename = useItemRename(boxId, item.id, item.title);

  return (
    <div className={`wbn-item-row${highlight ? ' wbn-item-new' : ''}`}>
      <span className="wbn-item-glyph">
        <Bookmark size={16} />
      </span>
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
          <a href={item.url} target="_blank" rel="noreferrer" onDoubleClick={rename.startRenaming}>
            <strong>{item.title}</strong>
          </a>
        )}
        <a className="wbn-item-subtitle-link" href={item.url} target="_blank" rel="noreferrer">
          {item.url}
        </a>
      </div>
      <ItemActions onEdit={rename.startRenaming} onDelete={rename.deleteItem} />
    </div>
  );
}

import type { ClipboardItem as ClipboardItemModel } from '../../domain/workspace';
import { ItemActions } from './ItemActions';
import { useItemRename } from './useItemRename';
import { useI18n } from '../../i18n/useI18n';

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
  const { t } = useI18n();

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
      ) : (
        <strong onDoubleClick={rename.startRenaming}>{item.title}</strong>
      )}
      <p>{item.text}</p>
      <small>{t('item.clipboardText')}</small>
      <ItemActions onEdit={rename.startRenaming} onDelete={rename.deleteItem} />
    </div>
  );
}

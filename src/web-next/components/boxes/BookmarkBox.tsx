import type { WorkspaceBox } from '../../domain/workspace';
import { getBoxAccent, getBoxIcon } from '../../domain/boxAppearance';
import { useUiStore } from '../../app/stores/uiStore';
import { BookmarkItem } from '../items/BookmarkItem';
import { SortableItemList } from '../items/SortableItemList';
import { BookmarkAddView } from './add-views/BookmarkAddView';
import { BaseBoxFrame } from './BaseBoxFrame';
import { useI18n } from '../../i18n/useI18n';
import { BoxAppearanceIcon } from './boxIconRegistry';

export function BookmarkBox({
  box,
  skipEntryAnimation = false,
}: {
  box: WorkspaceBox;
  skipEntryAnimation?: boolean;
}) {
  const draftState = useUiStore((state) => state.addDrafts[box.id]);
  const openAddView = useUiStore((state) => state.openAddView);
  const items = box.items.filter((item) => item.type === 'bookmark');
  const { t } = useI18n();
  const icon = getBoxIcon(box);

  return (
    <BaseBoxFrame
      box={box}
      icon={<BoxAppearanceIcon icon={icon} size={16} />}
      iconId={icon}
      accent={getBoxAccent(box)}
      onAddItem={() => openAddView(box.id)}
      skipEntryAnimation={skipEntryAnimation}
    >
      {draftState?.mode ? (
        <BookmarkAddView boxId={box.id} />
      ) : items.length ? (
        <SortableItemList
          boxId={box.id}
          items={items}
          viewMode={box.viewMode ?? 'list'}
          renderItem={(item) => (
            <BookmarkItem
              boxId={box.id}
              item={item}
              highlight={draftState?.highlightItemId === item.id}
            />
          )}
        />
      ) : (
        <div className="wbn-empty-state">{t('box.emptyBookmark')}</div>
      )}
    </BaseBoxFrame>
  );
}

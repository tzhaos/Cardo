import { Bookmark } from 'lucide-react';
import type { WorkspaceBox } from '../../domain/workspace';
import { useUiStore } from '../../app/stores/uiStore';
import { BookmarkItem } from '../items/BookmarkItem';
import { SortableItemList } from '../items/SortableItemList';
import { BookmarkAddView } from './add-views/BookmarkAddView';
import { BaseBoxFrame } from './BaseBoxFrame';
import { useI18n } from '../../i18n/useI18n';

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

  return (
    <BaseBoxFrame
      box={box}
      icon={<Bookmark size={16} />}
      accent="#f97316"
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

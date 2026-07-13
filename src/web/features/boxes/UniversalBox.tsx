import type { WorkspaceBox } from '../../domain/workspace';
import { getBoxAccent, getBoxIcon } from '../../domain/boxAppearance';
import { useUiStore } from '../../app/stores/uiStore';
import { BookmarkItem } from '../items/BookmarkItem';
import { ClipboardItem } from '../items/ClipboardItem';
import { LocalResourceItem } from '../items/LocalResourceItem';
import { SortableItemList } from '../items/SortableItemList';
import { UniversalAddView } from './add-views/UniversalAddView';
import { BaseBoxFrame } from './BaseBoxFrame';
import { useI18n } from '../../i18n/useI18n';
import { BoxAppearanceIcon } from './boxIconRegistry';

export function UniversalBox({
  box,
  skipEntryAnimation = false,
}: {
  box: WorkspaceBox;
  skipEntryAnimation?: boolean;
}) {
  const draftState = useUiStore((state) => state.addDrafts[box.id]);
  const openAddView = useUiStore((state) => state.openAddView);
  const { t } = useI18n();
  const accent = getBoxAccent(box);
  const icon = getBoxIcon(box);
  const defaultItemType = 'clipboard' as const;

  return (
    <BaseBoxFrame
      box={box}
      icon={<BoxAppearanceIcon icon={icon} size={16} />}
      iconId={icon}
      accent={accent}
      onAddItem={() => openAddView(box.id, defaultItemType)}
      skipEntryAnimation={skipEntryAnimation}
    >
      {draftState?.mode ? (
        <UniversalAddView boxId={box.id} defaultType={defaultItemType} />
      ) : box.items.length ? (
        <SortableItemList
          boxId={box.id}
          items={box.items}
          viewMode={box.kind === 'temporary' ? 'list' : box.viewMode}
          renderItem={(item) => renderItem(box.id, item, draftState?.highlightItemId === item.id)}
        />
      ) : (
        <div className="cardo-empty-state">{t('box.empty')}</div>
      )}
    </BaseBoxFrame>
  );
}

function renderItem(boxId: string, item: WorkspaceBox['items'][number], highlight: boolean) {
  switch (item.type) {
    case 'file':
    case 'shortcut':
    case 'folder':
      return <LocalResourceItem boxId={boxId} item={item} highlight={highlight} />;
    case 'bookmark':
      return <BookmarkItem boxId={boxId} item={item} highlight={highlight} />;
    case 'clipboard':
      return <ClipboardItem boxId={boxId} item={item} highlight={highlight} />;
  }
}

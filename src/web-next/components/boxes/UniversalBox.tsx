import { Bookmark, Clipboard, Folder, PackageOpen } from 'lucide-react';
import type { WorkspaceBox, WorkspaceItemType } from '../../domain/workspace';
import { useUiStore } from '../../app/stores/uiStore';
import { BookmarkItem } from '../items/BookmarkItem';
import { ClipboardItem } from '../items/ClipboardItem';
import { LocalResourceItem } from '../items/LocalResourceItem';
import { SortableItemList } from '../items/SortableItemList';
import { UniversalAddView } from './add-views/UniversalAddView';
import { BaseBoxFrame } from './BaseBoxFrame';
import { useI18n } from '../../i18n/useI18n';

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
  const appearance = getBoxAppearance(box.preset);
  const preferredItemType = getPreferredItemType(box.preset);

  return (
    <BaseBoxFrame
      box={box}
      icon={appearance.icon}
      accent={appearance.accent}
      onAddItem={() => openAddView(box.id, preferredItemType)}
      skipEntryAnimation={skipEntryAnimation}
    >
      {draftState?.mode ? (
        <UniversalAddView boxId={box.id} defaultType={preferredItemType} />
      ) : box.items.length ? (
        <SortableItemList
          boxId={box.id}
          items={box.items}
          viewMode={box.kind === 'temporary' ? 'list' : (box.viewMode ?? 'list')}
          renderItem={(item) => renderItem(box.id, item, draftState?.highlightItemId === item.id)}
        />
      ) : (
        <div className="wbn-empty-state">{t('box.empty')}</div>
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

function getPreferredItemType(preset: WorkspaceBox['preset']): WorkspaceItemType {
  return preset === 'general' ? 'clipboard' : preset;
}

function getBoxAppearance(preset: WorkspaceBox['preset']) {
  switch (preset) {
    case 'folder':
      return { icon: <Folder size={16} />, accent: '#3b82f6' };
    case 'bookmark':
      return { icon: <Bookmark size={16} />, accent: '#f97316' };
    case 'clipboard':
      return { icon: <Clipboard size={16} />, accent: '#10b981' };
    case 'general':
      return { icon: <PackageOpen size={16} />, accent: '#8b5cf6' };
  }
}

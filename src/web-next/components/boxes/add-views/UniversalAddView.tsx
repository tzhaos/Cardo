import { AppWindow, Bookmark, Clipboard, File, Folder } from 'lucide-react';
import { useUiStore } from '../../../app/stores/uiStore';
import type { WorkspaceItemType } from '../../../domain/workspace';
import { useI18n } from '../../../i18n/useI18n';
import { BookmarkAddView } from './BookmarkAddView';
import { ClipboardAddView } from './ClipboardAddView';
import { LocalResourceAddView } from './LocalResourceAddView';
import { Button } from '../../../ui/primitives/button';

const ITEM_TYPES = [
  { type: 'file' as const, icon: File, label: 'itemType.file' as const },
  { type: 'shortcut' as const, icon: AppWindow, label: 'itemType.shortcut' as const },
  { type: 'folder' as const, icon: Folder, label: 'itemType.folder' as const },
  { type: 'bookmark' as const, icon: Bookmark, label: 'itemType.bookmark' as const },
  { type: 'clipboard' as const, icon: Clipboard, label: 'itemType.clipboard' as const },
];

export function UniversalAddView({
  boxId,
  defaultType,
}: {
  boxId: string;
  defaultType: WorkspaceItemType;
}) {
  const selectedType = useUiStore((state) => state.addDrafts[boxId]?.itemType ?? defaultType);
  const selectAddItemType = useUiStore((state) => state.selectAddItemType);
  const { t } = useI18n();
  const typePicker = (
    <div className="cardo-item-type-picker" aria-label={t('add.itemType')}>
      {ITEM_TYPES.map(({ type, icon: Icon, label }) => (
        <Button
          variant="ghost"
          className={selectedType === type ? 'cardo-item-type-active' : undefined}
          key={type}
          type="button"
          title={t(label)}
          aria-label={t(label)}
          aria-pressed={selectedType === type}
          onClick={() => selectAddItemType(boxId, type)}
        >
          <Icon size={15} />
        </Button>
      ))}
    </div>
  );

  if (selectedType === 'bookmark') {
    return <BookmarkAddView boxId={boxId} typePicker={typePicker} />;
  }
  if (selectedType === 'clipboard') {
    return <ClipboardAddView boxId={boxId} typePicker={typePicker} />;
  }
  return <LocalResourceAddView boxId={boxId} type={selectedType} typePicker={typePicker} />;
}

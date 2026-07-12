import { useUiStore } from '../../../app/stores/uiStore';
import type { WorkspaceItemType } from '../../../domain/workspace';
import { useI18n } from '../../../i18n/useI18n';
import { ThemeIcon, type ThemeIconName } from '../../../ui/icons/ThemeIcon';
import { Button } from '../../../ui/primitives/button';
import { BookmarkAddView } from './BookmarkAddView';
import { ClipboardAddView } from './ClipboardAddView';
import { LocalResourceAddView } from './LocalResourceAddView';

const ITEM_TYPES: Array<{
  type: WorkspaceItemType;
  icon: ThemeIconName;
  label: 'itemType.file' | 'itemType.shortcut' | 'itemType.folder' | 'itemType.bookmark' | 'itemType.clipboard';
}> = [
  { type: 'file', icon: 'document', label: 'itemType.file' },
  { type: 'shortcut', icon: 'apps', label: 'itemType.shortcut' },
  { type: 'folder', icon: 'folder', label: 'itemType.folder' },
  { type: 'bookmark', icon: 'bookmark', label: 'itemType.bookmark' },
  { type: 'clipboard', icon: 'clipboard', label: 'itemType.clipboard' },
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
      {ITEM_TYPES.map(({ type, icon, label }) => (
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
          <ThemeIcon name={icon} size={15} />
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

import type { WorkspaceBox } from '../../domain/workspace';
import { getBoxAccent, getBoxIcon } from '../../domain/boxAppearance';
import { useUiStore } from '../../app/stores/uiStore';
import { ClipboardItem } from '../items/ClipboardItem';
import { SortableItemList } from '../items/SortableItemList';
import { ClipboardAddView } from './add-views/ClipboardAddView';
import { BaseBoxFrame } from './BaseBoxFrame';
import { useI18n } from '../../i18n/useI18n';
import { BoxAppearanceIcon } from './boxIconRegistry';

export function ClipboardBox({
  box,
  skipEntryAnimation = false,
}: {
  box: WorkspaceBox;
  skipEntryAnimation?: boolean;
}) {
  const draftState = useUiStore((state) => state.addDrafts[box.id]);
  const openAddView = useUiStore((state) => state.openAddView);
  const items = box.items.filter((item) => item.type === 'clipboard');
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
        <ClipboardAddView boxId={box.id} />
      ) : items.length ? (
        <SortableItemList
          boxId={box.id}
          items={items}
          viewMode={box.viewMode}
          renderItem={(item) => (
            <ClipboardItem
              boxId={box.id}
              item={item}
              highlight={draftState?.highlightItemId === item.id}
            />
          )}
        />
      ) : (
        <div className="wbn-empty-state">{t('box.emptyClipboard')}</div>
      )}
    </BaseBoxFrame>
  );
}

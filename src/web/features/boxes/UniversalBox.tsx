import type { WorkspaceBox } from '../../domain/workspace';
import { getBoxAccent, getBoxIcon } from '../../domain/boxAppearance';
import { useUiStore } from '../../app/stores/uiStore';
import { SortableItemList } from '../items/SortableItemList';
import { renderBoxItem } from '../items/renderBoxItem';
import { UniversalAddView } from './add-views/UniversalAddView';
import { BaseBoxFrame } from './BaseBoxFrame';
import { useI18n } from '../../i18n/useI18n';
import { BoxAppearanceIcon } from './boxIconRegistry';

/** Freeform canvas box — full chrome. */
export function UniversalBox({ box }: { box: WorkspaceBox }) {
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
    >
      {draftState?.mode ? <UniversalAddView boxId={box.id} defaultType={defaultItemType} /> : null}
      {box.items.length ? (
        <SortableItemList
          boxId={box.id}
          items={box.items}
          viewMode={box.kind === 'temporary' ? 'list' : box.viewMode}
          renderItem={(item) =>
            renderBoxItem(box.id, item, draftState?.highlightItemId === item.id)
          }
        />
      ) : !draftState?.mode ? (
        <div className="cardo-empty-state">{t('box.emptyHint')}</div>
      ) : null}
    </BaseBoxFrame>
  );
}

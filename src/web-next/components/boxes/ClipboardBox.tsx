import { Clipboard } from 'lucide-react';
import type { WorkspaceBox } from '../../domain/workspace';
import { useUiStore } from '../../app/stores/uiStore';
import { ClipboardItem } from '../items/ClipboardItem';
import { ClipboardAddView } from './add-views/ClipboardAddView';
import { BaseBoxFrame } from './BaseBoxFrame';
import { useI18n } from '../../i18n/useI18n';

export function ClipboardBox({ box }: { box: WorkspaceBox }) {
  const draftState = useUiStore((state) => state.addDrafts[box.id]);
  const openAddView = useUiStore((state) => state.openAddView);
  const items = box.items.filter((item) => item.type === 'clipboard');
  const { t } = useI18n();

  return (
    <BaseBoxFrame
      box={box}
      icon={<Clipboard size={16} />}
      accent="#10b981"
      onAddItem={() => openAddView(box.id)}
    >
      {draftState?.mode ? (
        <ClipboardAddView boxId={box.id} />
      ) : items.length ? (
        <div className="wbn-item-list">
          {items.map((item) => (
            <ClipboardItem
              boxId={box.id}
              item={item}
              key={item.id}
              highlight={draftState?.highlightItemId === item.id}
            />
          ))}
        </div>
      ) : (
        <div className="wbn-empty-state">{t('box.emptyClipboard')}</div>
      )}
    </BaseBoxFrame>
  );
}

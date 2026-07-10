import { Folder } from 'lucide-react';
import type { WorkspaceBox } from '../../domain/workspace';
import { useUiStore } from '../../app/stores/uiStore';
import { FolderItem } from '../items/FolderItem';
import { FolderAddView } from './add-views/FolderAddView';
import { BaseBoxFrame } from './BaseBoxFrame';
import { useI18n } from '../../i18n/useI18n';

export function FolderBox({ box }: { box: WorkspaceBox }) {
  const draftState = useUiStore((state) => state.addDrafts[box.id]);
  const openAddView = useUiStore((state) => state.openAddView);
  const items = box.items.filter((item) => item.type === 'folder');
  const { t } = useI18n();

  return (
    <BaseBoxFrame
      box={box}
      icon={<Folder size={16} />}
      accent="#3b82f6"
      onAddItem={() => openAddView(box.id)}
    >
      {draftState?.mode ? (
        <FolderAddView boxId={box.id} />
      ) : items.length ? (
        <div className="wbn-item-list">
          {items.map((item) => (
            <FolderItem
              boxId={box.id}
              item={item}
              key={item.id}
              highlight={draftState?.highlightItemId === item.id}
            />
          ))}
        </div>
      ) : (
        <div className="wbn-empty-state">{t('box.emptyFolder')}</div>
      )}
    </BaseBoxFrame>
  );
}

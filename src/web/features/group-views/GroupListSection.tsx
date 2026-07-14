import { useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useUiStore } from '../../app/stores/uiStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { getBoxAccent, getBoxIcon } from '../../domain/boxAppearance';
import type { WorkspaceBox } from '../../domain/workspace';
import { isRecycleBinPageId } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';
import { ThemeIcon } from '../../kit/icon';
import { IconButton } from '../../kit/icon-button';
import { UniversalAddView } from '../boxes/add-views/UniversalAddView';
import { BoxAppearanceIcon } from '../boxes/boxIconRegistry';
import { SortableItemList } from '../items/SortableItemList';
import { GroupBoxDeleteView } from './GroupBoxDeleteView';
import { renderGroupItem } from './renderGroupItem';

const DEFAULT_ITEM_TYPE = 'clipboard' as const;

/**
 * List morphology: group (box) as section + items in a compact grid.
 * Items use the same SortableItemList drag as freeform (reorder + cross-box).
 */
export function GroupListSection({ box }: { box: WorkspaceBox }) {
  const beginBoxDrag = useUiStore((state) => state.beginBoxDrag);
  const selectBox = useUiStore((state) => state.selectBox);
  const openAddView = useUiStore((state) => state.openAddView);
  const draftState = useUiStore((state) => state.addDrafts[box.id]);
  const deleteBox = useWorkspaceStore((state) => state.deleteBox);
  const { t } = useI18n();
  const accent = getBoxAccent(box);
  const icon = getBoxIcon(box);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const permanent = isRecycleBinPageId(box.pageId);

  const beginDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (box.isLocked || confirmDelete) return;
    if ((event.target as HTMLElement).closest('button,input,textarea,select,[data-no-drag]')) {
      return;
    }
    event.preventDefault();
    selectBox(box.id);
    const rect = event.currentTarget
      .closest<HTMLElement>('[data-canvas-box]')
      ?.getBoundingClientRect();
    const frame = rect
      ? {
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.max(240, Math.round(rect.width)),
          height: Math.max(170, Math.round(rect.height)),
        }
      : box.frame;
    let transformOrigin = '50% 20%';
    if (rect) {
      const ox = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
      const oy = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
      transformOrigin = `${ox}% ${oy}%`;
    }
    beginBoxDrag({
      boxId: box.id,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      startFrame: frame,
      latestFrame: frame,
      transformOrigin,
      morphology: 'list',
    });
  };

  return (
    <section
      className={`cardo-group-list-section${confirmDelete ? ' cardo-group-list-section-delete-view' : ''}`}
      data-canvas-box
      data-box-id={box.id}
      data-group-morph="item"
      style={{ ['--box-accent' as string]: accent }}
      onPointerDown={() => selectBox(box.id)}
    >
      {confirmDelete ? (
        <GroupBoxDeleteView
          permanent={permanent}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => deleteBox(box.id)}
        />
      ) : (
        <>
          <header className="cardo-group-list-section-header" onPointerDown={beginDrag}>
            <span className="cardo-group-list-grip" aria-hidden="true">
              <ThemeIcon name="grip" size={14} />
            </span>
            <span className="cardo-group-list-section-icon" aria-hidden="true">
              <BoxAppearanceIcon icon={icon} size={14} />
            </span>
            <strong className="cardo-group-list-section-title">{box.title}</strong>
            <span className="cardo-group-list-section-count">{box.items.length}</span>
            <IconButton
              data-no-drag
              aria-label={t('box.addItem')}
              tooltip={t('box.addItem')}
              onClick={() => openAddView(box.id, DEFAULT_ITEM_TYPE)}
            >
              <ThemeIcon name="add" size={14} strokeWidth={2} />
            </IconButton>
            <IconButton
              data-no-drag
              aria-label={t(permanent ? 'menu.deletePermanently' : 'menu.moveToRecycleBin')}
              tooltip={t(permanent ? 'menu.deletePermanently' : 'menu.moveToRecycleBin')}
              onClick={() => setConfirmDelete(true)}
            >
              <ThemeIcon name="trash" size={13} strokeWidth={2} />
            </IconButton>
          </header>
          {draftState?.mode ? (
            <div className="cardo-group-list-item-host" data-no-box-drag>
              <UniversalAddView boxId={box.id} defaultType={DEFAULT_ITEM_TYPE} />
            </div>
          ) : box.items.length ? (
            <div className="cardo-group-list-item-host" data-no-box-drag>
              <SortableItemList
                boxId={box.id}
                items={box.items}
                viewMode="grid"
                renderItem={(item) =>
                  renderGroupItem(box.id, item, draftState?.highlightItemId === item.id)
                }
              />
            </div>
          ) : (
            <div className="cardo-group-list-section-empty">{t('box.empty')}</div>
          )}
        </>
      )}
    </section>
  );
}

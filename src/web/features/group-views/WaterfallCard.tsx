import { useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { useUiStore } from '../../app/stores/uiStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { getBoxAccent, getBoxIcon } from '../../domain/boxAppearance';
import type { BoxFrame, WorkspaceBox } from '../../domain/workspace';
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
 * Waterfall morphology: compact card (not freeform box chrome).
 * Items use the same SortableItemList drag as freeform (reorder + cross-box).
 */
export function WaterfallCard({ box, frame }: { box: WorkspaceBox; frame: BoxFrame }) {
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
    let transformOrigin = '50% 50%';
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
      morphology: 'card',
    });
  };

  return (
    <article
      className={`cardo-waterfall-card${confirmDelete ? ' cardo-waterfall-card-delete-view' : ''}`}
      data-canvas-box
      data-box-id={box.id}
      data-group-morph="card"
      style={
        {
          left: frame.x,
          top: frame.y,
          width: frame.width,
          height: frame.height,
          ['--box-accent' as string]: accent,
        } as CSSProperties
      }
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
          <header className="cardo-waterfall-card-header" onPointerDown={beginDrag}>
            <span className="cardo-waterfall-card-icon" aria-hidden="true">
              <BoxAppearanceIcon icon={icon} size={14} />
            </span>
            <strong className="cardo-waterfall-card-title">{box.title}</strong>
            <span className="cardo-waterfall-card-count">{box.items.length}</span>
            <IconButton
              data-no-drag
              aria-label={t('box.addItem')}
              tooltip={t('box.addItem')}
              onClick={() => openAddView(box.id, DEFAULT_ITEM_TYPE)}
            >
              <ThemeIcon name="add" size={14} strokeWidth={2} />
            </IconButton>
            <IconButton
              className="cardo-waterfall-card-delete"
              data-no-drag
              aria-label={t(permanent ? 'menu.deletePermanently' : 'menu.moveToRecycleBin')}
              tooltip={t(permanent ? 'menu.deletePermanently' : 'menu.moveToRecycleBin')}
              onClick={() => setConfirmDelete(true)}
            >
              <ThemeIcon name="trash" size={13} strokeWidth={2} />
            </IconButton>
          </header>
          <div className="cardo-waterfall-card-body" data-no-box-drag>
            {draftState?.mode ? (
              <UniversalAddView boxId={box.id} defaultType={DEFAULT_ITEM_TYPE} />
            ) : box.items.length ? (
              <SortableItemList
                boxId={box.id}
                items={box.items}
                viewMode="list"
                renderItem={(item) =>
                  renderGroupItem(box.id, item, draftState?.highlightItemId === item.id)
                }
              />
            ) : (
              <div className="cardo-waterfall-card-empty">{t('box.empty')}</div>
            )}
          </div>
        </>
      )}
    </article>
  );
}

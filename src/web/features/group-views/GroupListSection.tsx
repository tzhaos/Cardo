import type { PointerEvent as ReactPointerEvent } from 'react';
import { useUiStore } from '../../app/stores/uiStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { getBoxAccent, getBoxIcon } from '../../domain/boxAppearance';
import type { WorkspaceBox } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';
import { ThemeIcon } from '../../kit/icon';
import { IconButton } from '../../kit/icon-button';
import { BoxAppearanceIcon } from '../boxes/boxIconRegistry';
import { renderGroupItem } from './renderGroupItem';

/**
 * List morphology: group (box) as section + items in a compact grid.
 * Not freeform box chrome — item rows/tiles under a group header.
 */
export function GroupListSection({ box }: { box: WorkspaceBox }) {
  const beginBoxDrag = useUiStore((state) => state.beginBoxDrag);
  const selectBox = useUiStore((state) => state.selectBox);
  const openAddView = useUiStore((state) => state.openAddView);
  const deleteBox = useWorkspaceStore((state) => state.deleteBox);
  const { t } = useI18n();
  const accent = getBoxAccent(box);
  const icon = getBoxIcon(box);

  const beginDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (box.isLocked) return;
    if ((event.target as HTMLElement).closest('button,input,textarea,select,[data-no-drag]')) {
      return;
    }
    event.preventDefault();
    selectBox(box.id);
    const rect = event.currentTarget
      .closest<HTMLElement>('[data-canvas-box]')
      ?.getBoundingClientRect();
    // Synthetic frame for drag session (list sections are flow layout, not absolute).
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
    });
  };

  return (
    <section
      className="cardo-group-list-section"
      data-canvas-box
      data-box-id={box.id}
      data-group-morph="item"
      style={{ ['--box-accent' as string]: accent }}
      onPointerDown={() => selectBox(box.id)}
    >
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
          onClick={() => openAddView(box.id, 'clipboard')}
        >
          <ThemeIcon name="add" size={14} strokeWidth={2} />
        </IconButton>
        <IconButton
          data-no-drag
          aria-label={t('menu.moveToRecycleBin')}
          tooltip={t('menu.moveToRecycleBin')}
          onClick={() => deleteBox(box.id)}
        >
          <ThemeIcon name="trash" size={13} strokeWidth={2} />
        </IconButton>
      </header>
      {box.items.length ? (
        <div className="cardo-group-list-item-grid">
          {box.items.map((item) => (
            <div className="cardo-group-list-item-cell" key={item.id}>
              {renderGroupItem(box.id, item)}
            </div>
          ))}
        </div>
      ) : (
        <div className="cardo-group-list-section-empty">{t('box.empty')}</div>
      )}
    </section>
  );
}

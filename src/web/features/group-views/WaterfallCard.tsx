import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { useUiStore } from '../../app/stores/uiStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { getBoxAccent, getBoxIcon } from '../../domain/boxAppearance';
import type { BoxFrame, WorkspaceBox } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';
import { ThemeIcon } from '../../kit/icon';
import { IconButton } from '../../kit/icon-button';
import { BoxAppearanceIcon } from '../boxes/boxIconRegistry';
import { renderGroupItem } from './renderGroupItem';

const PREVIEW_LIMIT = 4;

/**
 * Waterfall morphology: compact card (not freeform box chrome).
 * Drag from header for reorder / cross-page.
 */
export function WaterfallCard({ box, frame }: { box: WorkspaceBox; frame: BoxFrame }) {
  const beginBoxDrag = useUiStore((state) => state.beginBoxDrag);
  const selectBox = useUiStore((state) => state.selectBox);
  const deleteBox = useWorkspaceStore((state) => state.deleteBox);
  const { t } = useI18n();
  const accent = getBoxAccent(box);
  const icon = getBoxIcon(box);
  const preview = box.items.slice(0, PREVIEW_LIMIT);
  const more = Math.max(0, box.items.length - preview.length);

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
    });
  };

  return (
    <article
      className="cardo-waterfall-card"
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
      <header className="cardo-waterfall-card-header" onPointerDown={beginDrag}>
        <span className="cardo-waterfall-card-icon" aria-hidden="true">
          <BoxAppearanceIcon icon={icon} size={14} />
        </span>
        <strong className="cardo-waterfall-card-title">{box.title}</strong>
        <span className="cardo-waterfall-card-count">{box.items.length}</span>
        <IconButton
          className="cardo-waterfall-card-delete"
          data-no-drag
          aria-label={t('menu.moveToRecycleBin')}
          tooltip={t('menu.moveToRecycleBin')}
          onClick={() => deleteBox(box.id)}
        >
          <ThemeIcon name="trash" size={13} strokeWidth={2} />
        </IconButton>
      </header>
      <div className="cardo-waterfall-card-body">
        {preview.length ? (
          preview.map((item) => (
            <div className="cardo-waterfall-card-item" key={item.id}>
              {renderGroupItem(box.id, item)}
            </div>
          ))
        ) : (
          <div className="cardo-waterfall-card-empty">{t('box.empty')}</div>
        )}
        {more > 0 ? (
          <div className="cardo-waterfall-card-more">
            {t('groupView.moreItems', { count: more })}
          </div>
        ) : null}
      </div>
    </article>
  );
}

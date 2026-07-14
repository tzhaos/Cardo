import { useMemo } from 'react';
import { useCanvasStore } from '../../app/stores/canvasStore';
import { useUiStore } from '../../app/stores/uiStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import {
  isManagedGroupView,
  layoutGroupBoxes,
  measureGroupLayoutHeight,
  resolveGroupViewMode,
  sortBoxesForManagedMode,
} from '../../domain/groupLayout';
import type { GroupViewMode } from '../../../core/contracts/groupView';
import { useI18n } from '../../i18n/useI18n';
import { GroupListSection } from './GroupListSection';
import { WaterfallCard } from './WaterfallCard';

/** Compact list landing — closer to a real list item / section header, not full section. */
const LIST_LANDING_HEIGHT = 48;
/** Waterfall landing paints at most this tall so the hole stays readable without a giant slab. */
const WATERFALL_LANDING_MAX_HEIGHT = 120;

/**
 * Scroll document for waterfall (cards) and list (grouped items).
 * Not a freeform pan canvas.
 */
export function GroupScrollSurface({
  pageId,
  excludeBoxId,
}: {
  pageId: string;
  excludeBoxId?: string | null;
}) {
  const allBoxes = useWorkspaceStore((state) => state.projection.boxes);
  const pages = useWorkspaceStore((state) => state.projection.pages);
  const insertPreview = useUiStore((state) =>
    state.managedInsertPreview?.pageId === pageId ? state.managedInsertPreview : null,
  );
  const viewportWidth = useCanvasStore((state) => state.viewportSize.width);
  const { t } = useI18n();

  const mode = resolveGroupViewMode(pages, pageId) as Exclude<GroupViewMode, 'freeform'>;
  const boxes = useMemo(
    () =>
      sortBoxesForManagedMode(
        allBoxes.filter(
          (box) => box.pageId === pageId && (!excludeBoxId || box.id !== excludeBoxId),
        ),
        mode,
      ),
    [allBoxes, excludeBoxId, mode, pageId],
  );

  const width = viewportWidth > 0 ? viewportWidth : 960;
  const restFrames = useMemo(() => layoutGroupBoxes(boxes, mode, width), [boxes, mode, width]);

  // Live reflow: neighbors move into the hole predicted by insert index.
  const layoutFrames = useMemo(() => {
    if (!insertPreview || insertPreview.mode !== mode) return restFrames;
    // List uses flow layout — only the compact insert marker moves; do not reflow frames.
    if (mode === 'list') return restFrames;
    const next = new Map(restFrames);
    for (const [id, frame] of Object.entries(insertPreview.frames)) {
      next.set(id, frame);
    }
    return next;
  }, [insertPreview, mode, restFrames]);

  const contentHeight = useMemo(() => {
    const base = measureGroupLayoutHeight(layoutFrames);
    if (!insertPreview?.slotFrame || mode === 'list') return base;
    return Math.max(base, insertPreview.slotFrame.y + insertPreview.slotFrame.height + 24);
  }, [insertPreview, layoutFrames, mode]);

  if (!isManagedGroupView(mode)) {
    return null;
  }

  const inserting = Boolean(insertPreview && insertPreview.mode === mode);

  return (
    <div
      className={`cardo-group-scroll cardo-group-scroll-${mode}${inserting ? ' is-insert-previewing' : ''}`}
      data-group-scroll
      data-group-view-mode={mode}
      data-insert-preview={inserting ? 'true' : undefined}
    >
      {mode === 'list' ? (
        <div className="cardo-group-list-flow">
          {/*
            Page-level empty (zero boxes) is owned by WorkspaceCanvas (page.groupEmpty).
            This surface only renders sections + insert landings.
          */}
          {boxes.map((box, index) => (
            <div key={box.id} className="cardo-group-list-slot" data-list-slot-index={index}>
              {insertPreview?.mode === 'list' && insertPreview.insertIndex === index ? (
                <ListDropLanding label={t('groupView.dropHere')} />
              ) : null}
              <GroupListSection box={box} />
            </div>
          ))}
          {insertPreview?.mode === 'list' && insertPreview.insertIndex >= boxes.length ? (
            <ListDropLanding label={t('groupView.dropHere')} />
          ) : null}
        </div>
      ) : (
        <div className="cardo-group-waterfall-plane" style={{ minHeight: contentHeight }}>
          {boxes.map((box) => {
            const frame = layoutFrames.get(box.id) ?? box.frame;
            return <WaterfallCard key={box.id} box={box} frame={frame} />;
          })}
          {/* Card-shaped hole where the box will rest on release. */}
          {insertPreview?.mode === 'waterfall' && insertPreview.slotFrame ? (
            <div
              className="cardo-drop-landing cardo-drop-landing-waterfall"
              aria-hidden="true"
              style={{
                left: insertPreview.slotFrame.x,
                top: insertPreview.slotFrame.y,
                width: insertPreview.slotFrame.width,
                height: Math.min(insertPreview.slotFrame.height, WATERFALL_LANDING_MAX_HEIGHT),
              }}
            >
              <div className="cardo-drop-landing-chrome" />
              <span className="cardo-drop-landing-label">{t('groupView.dropHere')}</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

/** List morphology drop landing — item-row sized, not a full section slab. */
function ListDropLanding({ label }: { label: string }) {
  return (
    <div
      className="cardo-drop-landing cardo-drop-landing-list"
      aria-hidden="true"
      style={{ height: LIST_LANDING_HEIGHT, minHeight: LIST_LANDING_HEIGHT }}
    >
      <span className="cardo-drop-landing-list-line" />
      <span className="cardo-drop-landing-label">{label}</span>
    </div>
  );
}

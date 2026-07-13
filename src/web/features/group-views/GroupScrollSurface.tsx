import { useMemo } from 'react';
import { useCanvasStore } from '../../app/stores/canvasStore';
import { useUiStore } from '../../app/stores/uiStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import {
  isManagedGroupView,
  layoutGroupBoxes,
  measureGroupLayoutHeight,
  resolveGroupViewMode,
  sortBoxesForGroupLayout,
} from '../../domain/groupLayout';
import type { GroupViewMode } from '../../../core/contracts/groupView';
import { useI18n } from '../../i18n/useI18n';
import { GroupListSection } from './GroupListSection';
import { WaterfallCard } from './WaterfallCard';

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
  const groupViewModes = useUiStore((state) => state.groupViewModes);
  const viewportWidth = useCanvasStore((state) => state.viewportSize.width);
  const { t } = useI18n();

  const mode = resolveGroupViewMode(groupViewModes, pageId) as Exclude<GroupViewMode, 'freeform'>;
  const boxes = useMemo(
    () =>
      sortBoxesForGroupLayout(
        allBoxes.filter(
          (box) => box.pageId === pageId && (!excludeBoxId || box.id !== excludeBoxId),
        ),
      ),
    [allBoxes, excludeBoxId, pageId],
  );

  const width = viewportWidth > 0 ? viewportWidth : 960;
  const layoutFrames = useMemo(() => layoutGroupBoxes(boxes, mode, width), [boxes, mode, width]);
  const contentHeight = useMemo(() => measureGroupLayoutHeight(layoutFrames), [layoutFrames]);

  if (!isManagedGroupView(mode)) {
    return null;
  }

  return (
    <div
      className={`cardo-group-scroll cardo-group-scroll-${mode}`}
      data-group-scroll
      data-group-view-mode={mode}
    >
      {mode === 'list' ? (
        <div className="cardo-group-list-flow">
          {boxes.length === 0 ? (
            <div className="cardo-group-scroll-empty">{t('box.empty')}</div>
          ) : (
            boxes.map((box) => <GroupListSection key={box.id} box={box} />)
          )}
        </div>
      ) : (
        <div className="cardo-group-waterfall-plane" style={{ minHeight: contentHeight }}>
          {boxes.length === 0 ? (
            <div className="cardo-group-scroll-empty">{t('box.empty')}</div>
          ) : (
            boxes.map((box) => {
              const frame = layoutFrames.get(box.id) ?? box.frame;
              return <WaterfallCard key={box.id} box={box} frame={frame} />;
            })
          )}
        </div>
      )}
    </div>
  );
}

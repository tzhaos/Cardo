import { DEFAULT_GROUP_VIEW_MODE, type GroupViewMode } from '../../core/contracts/groupView';
import type { BoxFrame, WorkspaceBox } from './workspace';

const WATERFALL_COLUMN_WIDTH = 280;
const WATERFALL_GAP = 16;
const LIST_GAP = 12;
const LAYOUT_PAD = 16;
const LIST_ROW_MIN_HEIGHT = 200;
const LIST_MAX_WIDTH = 720;

export function isManagedGroupView(mode: GroupViewMode): boolean {
  return mode === 'waterfall' || mode === 'list';
}

/** Sort boxes for serial layouts: top-left first, then stable by id. */
export function sortBoxesForGroupLayout(boxes: readonly WorkspaceBox[]): WorkspaceBox[] {
  return [...boxes].sort((a, b) => {
    if (a.frame.y !== b.frame.y) return a.frame.y - b.frame.y;
    if (a.frame.x !== b.frame.x) return a.frame.x - b.frame.x;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Compute display frames for group view modes.
 * freeform keeps stored frames; waterfall/list reflow into a scrollable document.
 */
export function layoutGroupBoxes(
  boxes: readonly WorkspaceBox[],
  mode: GroupViewMode,
  viewportWidth: number,
): Map<string, BoxFrame> {
  const map = new Map<string, BoxFrame>();
  if (mode === 'freeform' || boxes.length === 0) {
    for (const box of boxes) {
      map.set(box.id, box.frame);
    }
    return map;
  }

  const ordered = sortBoxesForGroupLayout(boxes);
  const contentWidth = Math.max(240, viewportWidth - LAYOUT_PAD * 2);

  if (mode === 'list') {
    const rowWidth = Math.min(LIST_MAX_WIDTH, contentWidth);
    const x = LAYOUT_PAD + Math.max(0, Math.floor((contentWidth - rowWidth) / 2));
    let y = LAYOUT_PAD;
    for (const box of ordered) {
      const height = Math.max(LIST_ROW_MIN_HEIGHT, Math.min(box.frame.height, 420));
      map.set(box.id, {
        x,
        y,
        width: rowWidth,
        height,
      });
      y += height + LIST_GAP;
    }
    return map;
  }

  // waterfall: pack into columns by shortest column
  const columnCount = Math.max(
    1,
    Math.floor((contentWidth + WATERFALL_GAP) / (WATERFALL_COLUMN_WIDTH + WATERFALL_GAP)),
  );
  const columnWidth = Math.floor((contentWidth - WATERFALL_GAP * (columnCount - 1)) / columnCount);
  const columnHeights = Array.from({ length: columnCount }, () => LAYOUT_PAD);

  for (const box of ordered) {
    let col = 0;
    for (let i = 1; i < columnCount; i += 1) {
      if (columnHeights[i] < columnHeights[col]) col = i;
    }
    const x = LAYOUT_PAD + col * (columnWidth + WATERFALL_GAP);
    const y = columnHeights[col];
    const height = Math.max(170, box.frame.height);
    map.set(box.id, {
      x,
      y,
      width: columnWidth,
      height,
    });
    columnHeights[col] = y + height + WATERFALL_GAP;
  }
  return map;
}

/** Scroll content height for managed layouts. */
export function measureGroupLayoutHeight(frames: Map<string, BoxFrame>): number {
  let maxBottom = LAYOUT_PAD;
  for (const frame of frames.values()) {
    maxBottom = Math.max(maxBottom, frame.y + frame.height);
  }
  return maxBottom + LAYOUT_PAD;
}

/**
 * After a drag release in waterfall/list: choose insert index so the dropped
 * box snaps nearest the pointer, then reflow the whole page.
 */
export function reflowGroupBoxesAfterDrop(args: {
  boxes: readonly WorkspaceBox[];
  draggedId: string;
  dropFrame: BoxFrame;
  mode: Exclude<GroupViewMode, 'freeform'>;
  viewportWidth: number;
}): Map<string, BoxFrame> {
  const { boxes, draggedId, dropFrame, mode, viewportWidth } = args;
  const dragged = boxes.find((box) => box.id === draggedId);
  if (!dragged) {
    return layoutGroupBoxes(boxes, mode, viewportWidth);
  }

  const others = sortBoxesForGroupLayout(boxes.filter((box) => box.id !== draggedId));
  const dropCx = dropFrame.x + dropFrame.width / 2;
  const dropCy = dropFrame.y + dropFrame.height / 2;

  let bestAt = others.length;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let at = 0; at <= others.length; at += 1) {
    const trialOrder = [...others.slice(0, at), dragged, ...others.slice(at)];
    const frames = layoutGroupBoxes(trialOrder, mode, viewportWidth);
    const frame = frames.get(draggedId);
    if (!frame) continue;
    const cx = frame.x + frame.width / 2;
    const cy = frame.y + frame.height / 2;
    const score = (cx - dropCx) ** 2 + (cy - dropCy) ** 2;
    if (score < bestScore) {
      bestScore = score;
      bestAt = at;
    }
  }

  const finalOrder = [...others.slice(0, bestAt), dragged, ...others.slice(bestAt)];
  return layoutGroupBoxes(finalOrder, mode, viewportWidth);
}

/** Append a new box at the end of a managed layout (for create-in-list/waterfall). */
export function reflowGroupBoxesAppend(
  boxes: readonly WorkspaceBox[],
  mode: Exclude<GroupViewMode, 'freeform'>,
  viewportWidth: number,
): Map<string, BoxFrame> {
  return layoutGroupBoxes(sortBoxesForGroupLayout(boxes), mode, viewportWidth);
}

export function resolveGroupViewMode(
  modes: Record<string, GroupViewMode>,
  pageId: string,
): GroupViewMode {
  return modes[pageId] ?? DEFAULT_GROUP_VIEW_MODE;
}

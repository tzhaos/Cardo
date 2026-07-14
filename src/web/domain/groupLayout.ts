import { DEFAULT_GROUP_VIEW_MODE, type GroupViewMode } from '../../core/contracts/groupView';
import type { BoxFrame, WorkspaceBox } from './workspace';

const WATERFALL_COLUMN_WIDTH = 280;
const WATERFALL_GAP = 16;
const LIST_GAP = 12;
const LAYOUT_PAD = 16;
const LIST_ROW_MIN_HEIGHT = 200;
const LIST_MAX_WIDTH = 720;
const WATERFALL_MIN_HEIGHT = 170;
const WATERFALL_MAX_HEIGHT = 360;
const LIST_MAX_HEIGHT = 420;
const WATERFALL_COLUMNS_MAX = 4;
const LIST_COLUMNS_MAX = 3;

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
 *
 * preserveOrder: when true, pack in the given array order (required for insert-trial
 * and post-drop reflow). Default false re-sorts by stored frame (initial display).
 */
export function layoutGroupBoxes(
  boxes: readonly WorkspaceBox[],
  mode: GroupViewMode,
  viewportWidth: number,
  options?: { preserveOrder?: boolean; columnCount?: number },
): Map<string, BoxFrame> {
  const map = new Map<string, BoxFrame>();
  if (mode === 'freeform' || boxes.length === 0) {
    for (const box of boxes) {
      map.set(box.id, box.frame);
    }
    return map;
  }

  // Managed layouts use modeLayouts frames for size/order, never freeform frame.
  const withModeFrames = boxes.map((box) => ({
    ...box,
    frame: mode === 'list' ? box.modeLayouts.list : box.modeLayouts.waterfall,
  }));

  const ordered = options?.preserveOrder
    ? [...withModeFrames]
    : sortBoxesForGroupLayout(withModeFrames);
  const contentWidth = Math.max(240, viewportWidth - LAYOUT_PAD * 2);

  if (mode === 'list') {
    const columnCount = resolveListColumns(options?.columnCount, contentWidth);
    if (columnCount <= 1) {
      const rowWidth = Math.min(LIST_MAX_WIDTH, contentWidth);
      const x = LAYOUT_PAD + Math.max(0, Math.floor((contentWidth - rowWidth) / 2));
      let y = LAYOUT_PAD;
      for (const box of ordered) {
        const height = managedListHeight(box);
        map.set(box.id, { x, y, width: rowWidth, height });
        y += height + LIST_GAP;
      }
      return map;
    }
    // Multi-column list: pack sections into N columns (shortest-column).
    const columnWidth = Math.floor((contentWidth - LIST_GAP * (columnCount - 1)) / columnCount);
    const columnHeights = Array.from({ length: columnCount }, () => LAYOUT_PAD);
    for (const box of ordered) {
      let col = 0;
      for (let i = 1; i < columnCount; i += 1) {
        if (columnHeights[i] < columnHeights[col]) col = i;
      }
      const height = managedListHeight(box);
      map.set(box.id, {
        x: LAYOUT_PAD + col * (columnWidth + LIST_GAP),
        y: columnHeights[col],
        width: columnWidth,
        height,
      });
      columnHeights[col] += height + LIST_GAP;
    }
    return map;
  }

  // waterfall: pack into columns by shortest column, in given order
  const columnCount = resolveWaterfallColumns(options?.columnCount, contentWidth);
  const columnWidth = Math.floor((contentWidth - WATERFALL_GAP * (columnCount - 1)) / columnCount);
  const columnHeights = Array.from({ length: columnCount }, () => LAYOUT_PAD);

  for (const box of ordered) {
    let col = 0;
    for (let i = 1; i < columnCount; i += 1) {
      if (columnHeights[i] < columnHeights[col]) col = i;
    }
    const x = LAYOUT_PAD + col * (columnWidth + WATERFALL_GAP);
    const y = columnHeights[col];
    const height = managedWaterfallHeight(box);
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

export function resolveWaterfallColumns(
  preferred: number | undefined,
  contentWidth: number,
): number {
  if (preferred && preferred > 0) {
    return Math.max(1, Math.min(WATERFALL_COLUMNS_MAX, preferred));
  }
  return Math.max(
    1,
    Math.min(
      WATERFALL_COLUMNS_MAX,
      Math.floor((contentWidth + WATERFALL_GAP) / (WATERFALL_COLUMN_WIDTH + WATERFALL_GAP)),
    ),
  );
}

export function resolveListColumns(preferred: number | undefined, _contentWidth: number): number {
  if (preferred === undefined) return 1;
  return Math.max(1, Math.min(LIST_COLUMNS_MAX, preferred));
}

function managedWaterfallHeight(box: WorkspaceBox): number {
  return Math.max(WATERFALL_MIN_HEIGHT, Math.min(box.frame.height, WATERFALL_MAX_HEIGHT));
}

function managedListHeight(box: WorkspaceBox): number {
  return Math.max(LIST_ROW_MIN_HEIGHT, Math.min(box.frame.height, LIST_MAX_HEIGHT));
}

/** Scroll content height for managed layouts. */
export function measureGroupLayoutHeight(frames: Map<string, BoxFrame>): number {
  let maxBottom = LAYOUT_PAD;
  for (const frame of frames.values()) {
    maxBottom = Math.max(maxBottom, frame.y + frame.height);
  }
  return maxBottom + LAYOUT_PAD;
}

export type ManagedInsertResult = {
  insertIndex: number;
  slotFrame: BoxFrame | null;
  frames: Map<string, BoxFrame>;
};

/**
 * Pick insert index so the dragged box's reflowed slot is nearest the pointer.
 * dropPoint is in group-scroll content coordinates (not freeform world).
 *
 * Critical: trial layouts use preserveOrder so insert index actually changes packing.
 */
export function findManagedInsertIndex(args: {
  boxes: readonly WorkspaceBox[];
  draggedId: string;
  /** Content-space point under the pointer (scroll document). */
  dropPoint: { x: number; y: number };
  mode: Exclude<GroupViewMode, 'freeform'>;
  viewportWidth: number;
  columnCount?: number;
}): ManagedInsertResult {
  const { boxes, draggedId, dropPoint, mode, viewportWidth, columnCount } = args;
  const layoutOpts = { preserveOrder: true as const, columnCount };
  const dragged = boxes.find((box) => box.id === draggedId);
  if (!dragged) {
    const frames = layoutGroupBoxes(boxes, mode, viewportWidth, { columnCount });
    return { insertIndex: 0, slotFrame: null, frames };
  }

  const others = sortBoxesForGroupLayout(
    boxes
      .filter((box) => box.id !== draggedId)
      .map((box) => ({
        ...box,
        frame: mode === 'list' ? box.modeLayouts.list : box.modeLayouts.waterfall,
      })),
  ).map((box) => boxes.find((entry) => entry.id === box.id)!);

  const dropCx = dropPoint.x;
  const dropCy = dropPoint.y;

  let bestAt = others.length;
  let bestScore = Number.POSITIVE_INFINITY;
  let bestFrames = layoutGroupBoxes([...others, dragged], mode, viewportWidth, layoutOpts);

  for (let at = 0; at <= others.length; at += 1) {
    const trialOrder = [...others.slice(0, at), dragged, ...others.slice(at)];
    const frames = layoutGroupBoxes(trialOrder, mode, viewportWidth, layoutOpts);
    const frame = frames.get(draggedId);
    if (!frame) continue;
    const cx = frame.x + frame.width / 2;
    const cy = frame.y + frame.height / 2;
    const score = (cx - dropCx) ** 2 + (cy - dropCy) ** 2;
    if (score < bestScore) {
      bestScore = score;
      bestAt = at;
      bestFrames = frames;
    }
  }

  return {
    insertIndex: bestAt,
    slotFrame: bestFrames.get(draggedId) ?? null,
    frames: bestFrames,
  };
}

/**
 * List-only: insert index from pointer vs live section midlines (DOM).
 * Falls back to content-point scoring when elements are missing.
 */
export function findListInsertIndexFromDom(
  others: readonly WorkspaceBox[],
  clientY: number,
): number {
  for (let i = 0; i < others.length; i += 1) {
    const el = document.querySelector<HTMLElement>(`[data-box-id="${CSS.escape(others[i].id)}"]`);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) {
      return i;
    }
  }
  return others.length;
}

/**
 * After a drag release in waterfall/list: choose insert index so the dropped
 * box snaps nearest the pointer, then reflow the whole page.
 * Pass insertIndex to reuse the live landing index (list preview vs geometry mismatch).
 */
export function reflowGroupBoxesAfterDrop(args: {
  boxes: readonly WorkspaceBox[];
  draggedId: string;
  dropPoint: { x: number; y: number };
  mode: Exclude<GroupViewMode, 'freeform'>;
  viewportWidth: number;
  insertIndex?: number;
  columnCount?: number;
}): Map<string, BoxFrame> {
  const { boxes, draggedId, mode, viewportWidth, insertIndex, columnCount } = args;
  const opts = { preserveOrder: true as const, columnCount };
  if (insertIndex !== undefined) {
    const dragged = boxes.find((box) => box.id === draggedId);
    if (!dragged) return layoutGroupBoxes(boxes, mode, viewportWidth, { columnCount });
    const others = sortManagedBoxes(
      boxes.filter((box) => box.id !== draggedId),
      mode,
    );
    const at = Math.max(0, Math.min(insertIndex, others.length));
    const trialOrder = [...others.slice(0, at), dragged, ...others.slice(at)];
    return layoutGroupBoxes(trialOrder, mode, viewportWidth, opts);
  }
  if (mode === 'list') {
    const others = sortManagedBoxes(
      boxes.filter((box) => box.id !== draggedId),
      mode,
    );
    const dragged = boxes.find((box) => box.id === draggedId);
    if (!dragged) return layoutGroupBoxes(boxes, mode, viewportWidth, { columnCount });
    const root = document.querySelector<HTMLElement>('[data-group-scroll]');
    let clientY = args.dropPoint.y;
    if (root) {
      const rect = root.getBoundingClientRect();
      clientY = args.dropPoint.y - root.scrollTop + rect.top;
    }
    const at = findListInsertIndexFromDom(others, clientY);
    const trialOrder = [...others.slice(0, at), dragged, ...others.slice(at)];
    return layoutGroupBoxes(trialOrder, mode, viewportWidth, opts);
  }
  return findManagedInsertIndex(args).frames;
}

function sortManagedBoxes(
  boxes: readonly WorkspaceBox[],
  mode: Exclude<GroupViewMode, 'freeform'>,
) {
  return sortBoxesForGroupLayout(
    boxes.map((box) => ({
      ...box,
      frame: mode === 'list' ? box.modeLayouts.list : box.modeLayouts.waterfall,
    })),
  ).map((box) => boxes.find((entry) => entry.id === box.id)!);
}

/** Append a new box at the end of a managed layout (for create-in-list/waterfall). */
export function reflowGroupBoxesAppend(
  boxes: readonly WorkspaceBox[],
  mode: Exclude<GroupViewMode, 'freeform'>,
  viewportWidth: number,
): Map<string, BoxFrame> {
  return layoutGroupBoxes(sortBoxesForGroupLayout(boxes), mode, viewportWidth, {
    preserveOrder: true,
  });
}

/** Resolve persisted group layout mode from workspace projection pages. */
export function resolveGroupViewMode(
  pages: readonly { id: string; groupViewMode: GroupViewMode }[],
  pageId: string,
): GroupViewMode {
  return pages.find((page) => page.id === pageId)?.groupViewMode ?? DEFAULT_GROUP_VIEW_MODE;
}

/** Map client pointer into group-scroll content coordinates. */
export function clientPointToGroupScrollContent(
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  const root = document.querySelector<HTMLElement>('[data-group-scroll]');
  if (!root) return null;
  const rect = root.getBoundingClientRect();
  return {
    x: Math.round(clientX - rect.left + root.scrollLeft),
    y: Math.round(clientY - rect.top + root.scrollTop),
  };
}

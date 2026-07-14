import { useCanvasStore } from '../../app/stores/canvasStore';
import { useUiStore } from '../../app/stores/uiStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import {
  clientPointToGroupScrollContent,
  findListInsertIndexFromDom,
  findManagedInsertIndex,
  layoutGroupBoxes,
  resolveGroupViewMode,
  sortBoxesForManagedMode,
} from '../../domain/groupLayout';
import { isSystemPageId } from '../../domain/workspace';

/**
 * Live drop-landing preview for waterfall/list:
 * opens a morphology-correct hole where the box will rest on release.
 * Call on every pointer move while a managed drag is active.
 *
 * Freeform morphology is allowed when the active page is managed (e.g. cross-page
 * sidebar hover from a freeform origin) — the ghost stays freeform but the landing
 * hole still opens using the destination mode.
 */
export function updateManagedInsertPreview(clientX: number, clientY: number): void {
  const workspace = useWorkspaceStore.getState();
  const ui = useUiStore.getState();
  const session = ui.boxDragSession;
  if (!session) {
    ui.setManagedInsertPreview(null);
    return;
  }
  if (ui.boxDragOverTopBar) {
    ui.setManagedInsertPreview(null);
    return;
  }

  const pageId = workspace.projection.activePageId;
  if (isSystemPageId(pageId)) {
    ui.setManagedInsertPreview(null);
    return;
  }

  const mode = resolveGroupViewMode(workspace.projection.pages, pageId);
  if (mode !== 'waterfall' && mode !== 'list') {
    ui.setManagedInsertPreview(null);
    return;
  }

  // card/list ghosts use their morphology; freeform over a managed page uses page mode.
  const managedMode = session.morphology === 'list' || mode === 'list' ? 'list' : 'waterfall';
  const viewportWidth = useCanvasStore.getState().viewportSize.width || 960;
  const pageBoxes = workspace.projection.boxes.filter((box) => box.pageId === pageId);
  const draggedId = session.boxId;
  const dragged = pageBoxes.find((box) => box.id === draggedId);
  if (!dragged) {
    ui.setManagedInsertPreview(null);
    return;
  }

  const dropPoint = clientPointToGroupScrollContent(clientX, clientY);
  if (!dropPoint) {
    ui.setManagedInsertPreview(null);
    return;
  }

  let insertIndex: number;
  let slotFrame: { x: number; y: number; width: number; height: number } | null;
  let frames: Map<string, { x: number; y: number; width: number; height: number }>;

  if (managedMode === 'list') {
    const others = sortBoxesForManagedMode(
      pageBoxes.filter((box) => box.id !== draggedId),
      'list',
    );
    // DOM midlines of remaining sections (compact landing barely shifts them).
    insertIndex = findListInsertIndexFromDom(others, clientY);
    const trialOrder = [...others.slice(0, insertIndex), dragged, ...others.slice(insertIndex)];
    frames = layoutGroupBoxes(trialOrder, 'list', viewportWidth, { preserveOrder: true });
    // Compact slot for paint; commit still reuses insertIndex + full reflow frames.
    const full = frames.get(draggedId);
    slotFrame = full
      ? { ...full, height: Math.min(full.height, 48) }
      : { x: 0, y: 0, width: 240, height: 48 };
  } else {
    const result = findManagedInsertIndex({
      boxes: pageBoxes,
      draggedId,
      dropPoint,
      mode: 'waterfall',
      viewportWidth,
    });
    insertIndex = result.insertIndex;
    slotFrame = result.slotFrame;
    frames = result.frames;
  }

  if (!slotFrame) {
    ui.setManagedInsertPreview(null);
    return;
  }

  const frameRecord: Record<string, { x: number; y: number; width: number; height: number }> = {};
  for (const [id, frame] of frames) {
    if (id === draggedId) continue;
    frameRecord[id] = frame;
  }

  ui.setManagedInsertPreview({
    pageId,
    mode: managedMode,
    insertIndex,
    slotFrame,
    frames: frameRecord,
  });
}

export function clearManagedInsertPreview(): void {
  useUiStore.getState().setManagedInsertPreview(null);
}

import { useUiStore } from '../../app/stores/uiStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { WorkspaceBoxRenderer } from './WorkspaceBoxRenderer';

/**
 * Floating finger ghost for freeform box drag (fixed layer under pointer).
 * Drop landing silhouettes live in the document plane (PageBoxes).
 */
export function FloatingDragLayer() {
  const draggedBoxId = useUiStore((state) => state.draggedBoxId);
  const session = useUiStore((state) => state.boxDragSession);
  const box = useWorkspaceStore((state) =>
    draggedBoxId
      ? (state.projection.boxes.find((entry) => entry.id === draggedBoxId) ?? null)
      : null,
  );

  if (!box || !session || session.boxId !== box.id) {
    return null;
  }

  // Freeform: live box chrome under finger; slightly translucent so world landing peeks.
  return (
    <div
      className="cardo-dragged-box-layer cardo-dragged-box-layer-freeform"
      aria-hidden="true"
      data-drag-morph="freeform"
    >
      <WorkspaceBoxRenderer box={box} />
    </div>
  );
}

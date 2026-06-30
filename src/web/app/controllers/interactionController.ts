import type { SnapPreview } from '../../../core/domains/layout/model/snap';
import { useInteractionStore } from '../stores/useInteractionStore';

export function getInteractionSnapshot() {
  const { activeBoxId, editingSessionId } = useInteractionStore.getState();
  return { activeBoxId, editingSessionId };
}

export function hasEditingSession() {
  return Boolean(useInteractionStore.getState().editingSessionId);
}

export function clearEditingSessionIfActive(sessionId: string) {
  const state = useInteractionStore.getState();

  if (state.editingSessionId === sessionId) {
    state.setEditingSessionId(null);
  }
}

export function setSnapPreview(preview: SnapPreview | null) {
  useInteractionStore.getState().setSnapPreview(preview);
}

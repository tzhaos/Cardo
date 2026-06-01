import type { SnapPreview } from '../../../core/domains/layout/model/snap';
import type { BoxTransitionState } from '../stores/useInteractionStore';
import { useInteractionStore } from '../stores/useInteractionStore';

export function getInteractionSnapshot() {
  const { activeBoxId, boxTransition, editingSessionId } = useInteractionStore.getState();
  return { activeBoxId, boxTransition, editingSessionId };
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

export function getBoxTransition() {
  return useInteractionStore.getState().boxTransition;
}

export function setBoxTransition(transition: BoxTransitionState | null) {
  useInteractionStore.getState().setBoxTransition(transition);
}

export function clearBoxTransitionIfActive(boxId: string) {
  const state = useInteractionStore.getState();

  if (state.boxTransition?.boxId === boxId) {
    state.setBoxTransition(null);
  }
}

export function setSnapPreview(preview: SnapPreview | null) {
  useInteractionStore.getState().setSnapPreview(preview);
}

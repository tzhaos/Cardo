import { useInteractionStore } from '../../../app/stores/useInteractionStore';

export function useDraggableItemState() {
  const editingSessionId = useInteractionStore((state) => state.editingSessionId);

  return {
    dragDisabled: Boolean(editingSessionId),
  };
}

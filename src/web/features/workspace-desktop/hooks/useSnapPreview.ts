import { useInteractionStore } from '../../../app/stores/useInteractionStore';

export function useSnapPreview() {
  return useInteractionStore((state) => state.snapPreview);
}

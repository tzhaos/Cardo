import { createToggleAllBoxesMinimizedCommand } from '../../../core/services/workspaceActions';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';

export function toggleAllBoxesMinimized() {
  const { snapshot, dispatch } = useWorkspaceStore.getState();
  const { areBoxesNowMinimized, command } = createToggleAllBoxesMinimizedCommand(snapshot);

  dispatch(command);

  return areBoxesNowMinimized;
}

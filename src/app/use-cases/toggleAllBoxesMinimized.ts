import { areAllBoxesMinimized } from '../../domains/workspace/model/workspaceSelectors';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';

export function toggleAllBoxesMinimized() {
  const { snapshot, dispatch } = useWorkspaceStore.getState();
  const areBoxesNowMinimized = !areAllBoxesMinimized(snapshot);

  dispatch({
    type: 'workspace.toggleAllBoxesMinimized',
  });

  return areBoxesNowMinimized;
}

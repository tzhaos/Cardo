import {
  MAX_WORKSPACE_BOXES,
  type WorkspaceBox,
} from '../../../core/domains/workspace/model/workspace';
import { createWorkspaceBoxCommand } from '../../../core/services/workspaceActions';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { createId } from './createId';

export type CreateWorkspaceBoxResult =
  | { status: 'created'; box: WorkspaceBox }
  | { status: 'limit-reached'; limit: number };

export function createWorkspaceBox(placement: { centerX: number; centerY: number }) {
  const { snapshot, dispatch } = useWorkspaceStore.getState();
  const result = createWorkspaceBoxCommand(snapshot, placement, createId);

  if (result.status === 'limit-reached') {
    return {
      status: 'limit-reached' as const,
      limit: MAX_WORKSPACE_BOXES,
    };
  }

  dispatch(result.command);

  return {
    status: 'created' as const,
    box: result.box,
  };
}

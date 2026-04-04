import {
  MAX_WORKSPACE_BOXES,
  type WorkspaceBox,
} from '../../domains/workspace/model/workspace';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { createId } from './createId';

export type CreateWorkspaceBoxResult =
  | { status: 'created'; box: WorkspaceBox }
  | { status: 'limit-reached'; limit: number };

export function createWorkspaceBox(viewport: { width: number; height: number }) {
  const { snapshot, dispatch } = useWorkspaceStore.getState();

  if (snapshot.boxOrder.length >= MAX_WORKSPACE_BOXES) {
    return {
      status: 'limit-reached' as const,
      limit: MAX_WORKSPACE_BOXES,
    };
  }

  const box: WorkspaceBox = {
    id: createId('box'),
    role: null,
    customTitle: null,
    bounds: {
      x: viewport.width / 2 - 160,
      y: viewport.height / 2 - 200,
      width: 320,
      height: 400,
    },
    isLocked: false,
    isMinimized: false,
    layout: 'list',
    zIndex: snapshot.maxZIndex + 1,
    items: [],
  };

  dispatch({
    type: 'box.create',
    box,
  });

  return {
    status: 'created' as const,
    box,
  };
}

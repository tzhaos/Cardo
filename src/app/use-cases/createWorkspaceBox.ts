import { DEFAULT_BOX_THEME } from '../../domains/workspace/model/boxThemes';
import type { WorkspaceBox } from '../../domains/workspace/model/workspace';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { createId } from './createId';

export function createWorkspaceBox(viewport: { width: number; height: number }) {
  const { snapshot, dispatch } = useWorkspaceStore.getState();
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
    theme: DEFAULT_BOX_THEME,
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

  return box;
}

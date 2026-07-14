import { useEffect } from 'react';
import { useUiStore } from './stores/uiStore';
import { useWorkspaceStore } from './stores/workspaceStore';

/**
 * Keeps titlebar back/forward stacks in sync with workspace active page.
 * Session-only UI history — not Runtime history / undo.
 */
export function useNavHistorySync() {
  const activePageId = useWorkspaceStore((state) => state.projection.activePageId);

  useEffect(() => {
    if (!activePageId) return;
    useUiStore.getState().recordPageVisit(activePageId);
  }, [activePageId]);
}

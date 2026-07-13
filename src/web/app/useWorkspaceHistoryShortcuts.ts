import { useEffect } from 'react';
import { useWorkspaceStore } from './stores/workspaceStore';

export function useWorkspaceHistoryShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || isEditableTarget(event.target))
        return;
      const key = event.key.toLowerCase();
      const shouldRedo = key === 'y' || (key === 'z' && event.shiftKey);
      if (key !== 'z' && !shouldRedo) return;
      event.preventDefault();
      const history = useWorkspaceStore.getState();
      if (shouldRedo) history.redo();
      else history.undo();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest('input,textarea,select,[contenteditable="true"]'))
  );
}

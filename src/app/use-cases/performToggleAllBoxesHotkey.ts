import type { ToastSpec } from '../presentation/toastSpec';
import { toggleAllBoxesMinimized } from './toggleAllBoxesMinimized';

export function performToggleAllBoxesHotkey(): ToastSpec {
  const allMinimized = toggleAllBoxesMinimized();
  return {
    level: 'plain',
    messageKey: allMinimized ? 'workspace.hideAllBoxes' : 'workspace.showAllBoxes',
  };
}

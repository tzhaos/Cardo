import { useMemo, useState } from 'react';
import { useI18n } from '../../../app/hooks/useI18n';
import { useInteractionStore } from '../../../app/stores/useInteractionStore';
import { useCanvasStore } from '../../../app/stores/useCanvasStore';
import { usePreferencesStore } from '../../../app/stores/usePreferencesStore';
import { useVisibleBoxes, useWorkspaceSnapshot } from '../../../app/stores/useWorkspaceSelectors';
import type { WorkspaceBox } from '../../../../core/domains/workspace/model/workspace';
import { getBoxItems } from '../../../../core/domains/workspace/model/workspaceSelectors';
import { useViewportCamera } from './useViewportCamera';

export type WorkspaceProductTabId = 'workbench' | 'files' | 'web' | 'reading';

function hasItemType(
  box: WorkspaceBox,
  snapshot: ReturnType<typeof useWorkspaceSnapshot>,
  types: string[],
) {
  return getBoxItems(snapshot, box.id).some((item) => types.includes(item.type));
}

function belongsToTab(
  box: WorkspaceBox,
  snapshot: ReturnType<typeof useWorkspaceSnapshot>,
  tabId: WorkspaceProductTabId,
) {
  if (tabId === 'files') {
    return hasItemType(box, snapshot, ['file', 'folder', 'shortcut']);
  }

  if (tabId === 'web') {
    return (
      box.templateId === 'web-library' ||
      box.templateId === 'frequent-sites' ||
      box.templateId === 'launcher' ||
      hasItemType(box, snapshot, ['url'])
    );
  }

  if (tabId === 'reading') {
    return box.templateId === 'reading-list';
  }

  return !['web-library', 'frequent-sites', 'reading-list'].includes(box.templateId);
}

export function useWorkspaceDesktopState() {
  const { t } = useI18n();
  const snapshot = useWorkspaceSnapshot();
  const visibleBoxes = useVisibleBoxes();
  const setActiveBox = useInteractionStore((state) => state.setActiveBox);
  const camera = useViewportCamera();
  const isViewportLocked = useCanvasStore((state) => state.isLocked);
  const interactionMode = useCanvasStore((state) => state.interactionMode);
  const isPanModifierActive = useCanvasStore((state) => state.isPanModifierActive);
  const theme = usePreferencesStore((state) => state.theme);
  const [activeTabId, setActiveTabId] = useState<WorkspaceProductTabId>('workbench');
  const tabs = useMemo(
    () =>
      [
        { id: 'workbench', label: t('workspace.tab.workbench') },
        { id: 'files', label: t('workspace.tab.files') },
        { id: 'web', label: t('workspace.tab.web') },
        { id: 'reading', label: t('workspace.tab.reading') },
      ] satisfies Array<{ id: WorkspaceProductTabId; label: string }>,
    [t],
  );
  const visibleTabBoxes = useMemo(
    () => visibleBoxes.filter((box) => belongsToTab(box, snapshot, activeTabId)),
    [activeTabId, snapshot, visibleBoxes],
  );

  return {
    brandLabel: t('app.brand'),
    camera,
    isViewportLocked,
    interactionMode,
    isPanModifierActive,
    theme,
    activeTabId,
    tabs,
    pageEmptyLabel: t('workspace.pageEmpty'),
    visibleBoxes: visibleTabBoxes,
    clearActiveBox: () => setActiveBox(null),
    setActiveTabId,
  };
}

import { useCallback, useMemo, useState } from 'react';
import { useI18n } from '../../../app/hooks/useI18n';
import { useInteractionStore } from '../../../app/stores/useInteractionStore';
import { usePreferencesStore } from '../../../app/stores/usePreferencesStore';
import { useVisibleBoxes, useWorkspaceDispatch } from '../../../app/stores/useWorkspaceSelectors';
import { createWorkspaceBox } from '../../../app/use-cases/createWorkspaceBox';
import { BOX_TEMPLATE_LIBRARY } from '../../../../core/domains/workspace/model/boxTemplates';
import type { BoxTemplateId } from '../../../../core/domains/workspace/model/workspace';

export type WorkspaceProductTabId = BoxTemplateId;

const TEMPLATE_PAGE_ORDER: BoxTemplateId[] = [
  'kanban',
  'collection',
  'launcher',
  'inbox',
  'project-board',
  'daily-desk',
  'web-library',
  'frequent-sites',
  'reading-list',
];

export function useWorkspaceDesktopState() {
  const { t } = useI18n();
  const visibleBoxes = useVisibleBoxes();
  const dispatch = useWorkspaceDispatch();
  const setActiveBox = useInteractionStore((state) => state.setActiveBox);
  const setFocusedItemInfo = useInteractionStore((state) => state.setFocusedItemInfo);
  const theme = usePreferencesStore((state) => state.theme);
  const [activeTabId, setActiveTabId] = useState<WorkspaceProductTabId>(
    TEMPLATE_PAGE_ORDER.find((templateId) =>
      visibleBoxes.some((box) => box.templateId === templateId),
    ) ?? TEMPLATE_PAGE_ORDER[0],
  );
  const tabs = useMemo(
    () =>
      TEMPLATE_PAGE_ORDER.map((templateId) =>
        BOX_TEMPLATE_LIBRARY.find((template) => template.id === templateId),
      )
        .filter((template): template is (typeof BOX_TEMPLATE_LIBRARY)[number] => Boolean(template))
        .map((template) => ({
          id: template.id,
          label: t(template.titleKey),
        })),
    [t],
  );
  const visibleTabBoxes = useMemo(
    () => visibleBoxes.filter((box) => box.templateId === activeTabId),
    [activeTabId, visibleBoxes],
  );
  const createBoxForActiveTab = useCallback(
    (placement: { centerX: number; centerY: number }) => {
      const result = createWorkspaceBox({
        ...placement,
        templateId: activeTabId,
      });

      if (result.status === 'created') {
        setActiveBox(result.box.id);
        setFocusedItemInfo(
          result.initialFocusItemId
            ? { boxId: result.box.id, itemId: result.initialFocusItemId }
            : null,
        );
        dispatch({ type: 'box.bringToFront', boxId: result.box.id });
      }

      return result;
    },
    [activeTabId, dispatch, setActiveBox, setFocusedItemInfo],
  );

  return {
    brandLabel: t('app.brand'),
    theme,
    activeTabId,
    boxCount: visibleBoxes.length,
    tabs,
    pageEmptyLabel: t('workspace.pageEmpty'),
    visibleBoxes: visibleTabBoxes,
    clearActiveBox: () => setActiveBox(null),
    createBoxForActiveTab,
    dispatch,
    setActiveTabId,
  };
}

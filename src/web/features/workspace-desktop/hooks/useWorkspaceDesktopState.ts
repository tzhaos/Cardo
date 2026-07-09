import { usePreferencesStore } from '../../../app/stores/usePreferencesStore';
import { useCallback, useMemo, useState } from 'react';
import { BOX_TEMPLATE_LIBRARY } from '../../../../core/domains/workspace/model/boxTemplates';
import {
  MAX_WORKSPACE_BOXES,
  type BoxTemplateId,
} from '../../../../core/domains/workspace/model/workspace';
import { useI18n } from '../../../app/hooks/useI18n';
import { useInteractionStore } from '../../../app/stores/useInteractionStore';
import { useVisibleBoxes, useWorkspaceDispatch } from '../../../app/stores/useWorkspaceSelectors';
import { createWorkspaceBox } from '../../../app/use-cases/createWorkspaceBox';

export type WorkspaceProductTabId = BoxTemplateId;

const TEMPLATE_PAGE_ORDER: BoxTemplateId[] = [
  'collection',
  'launcher',
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
  const activeBoxId = useInteractionStore((state) => state.activeBoxId);
  const focusedItemInfo = useInteractionStore((state) => state.focusedItemInfo);
  const theme = usePreferencesStore((state) => state.theme);
  const [activeTabId, setActiveTabId] = useState<WorkspaceProductTabId>(
    TEMPLATE_PAGE_ORDER.find((templateId) =>
      visibleBoxes.some((box) => box.templateId === templateId),
    ) ?? TEMPLATE_PAGE_ORDER[0],
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

  const activeBox = useMemo(
    () => visibleBoxes.find((box) => box.id === activeBoxId) ?? null,
    [activeBoxId, visibleBoxes],
  );

  const focusedBox = useMemo(
    () =>
      (focusedItemInfo
        ? visibleBoxes.find((box) => box.id === focusedItemInfo.boxId)
        : null) ?? activeBox,
    [activeBox, focusedItemInfo, visibleBoxes],
  );

  const boxCountsByTemplate = useMemo(
    () =>
      visibleBoxes.reduce<Record<BoxTemplateId, number>>((counts, box) => {
        counts[box.templateId] = (counts[box.templateId] ?? 0) + 1;
        return counts;
      }, {} as Record<BoxTemplateId, number>),
    [visibleBoxes],
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

  const recentBoxes = useMemo(
    () => [...visibleBoxes].sort((left, right) => right.zIndex - left.zIndex).slice(0, 6),
    [visibleBoxes],
  );

  const pinnedBoxes = useMemo(
    () => visibleBoxes.filter((box) => box.isLocked || box.isCollapsed).slice(0, 6),
    [visibleBoxes],
  );

  return {
    activeBox,
    activeBoxId,
    activeTabId,
    boxCount: visibleBoxes.length,
    boxCountsByTemplate,
    brandLabel: t('app.brand'),
    clearActiveBox: () => setActiveBox(null),
    closeSettings: () => setIsSettingsOpen(false),
    createBoxForActiveTab,
    dispatch,
    focusedBox,
    focusedItemInfo,
    hasReachedBoxLimit: visibleBoxes.length >= MAX_WORKSPACE_BOXES,
    isSettingsOpen,
    openSettings: () => setIsSettingsOpen(true),
    pageEmptyLabel: t('workspace.pageEmpty'),
    pinnedBoxes,
    recentBoxes,
    setActiveTabId,
    tabs,
    theme,
    visibleBoxes: visibleTabBoxes,
  };
}




import { useMemo, useState } from 'react';
import { useI18n } from '../../../app/hooks/useI18n';
import { useInteractionStore } from '../../../app/stores/useInteractionStore';
import { usePreferencesStore } from '../../../app/stores/usePreferencesStore';
import { useVisibleBoxes } from '../../../app/stores/useWorkspaceSelectors';
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
  const setActiveBox = useInteractionStore((state) => state.setActiveBox);
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

  return {
    brandLabel: t('app.brand'),
    theme,
    activeTabId,
    tabs,
    pageEmptyLabel: t('workspace.pageEmpty'),
    visibleBoxes: visibleTabBoxes,
    clearActiveBox: () => setActiveBox(null),
    setActiveTabId,
  };
}

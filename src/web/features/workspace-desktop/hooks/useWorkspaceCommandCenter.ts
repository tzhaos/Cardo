import { useMemo, useState } from 'react';
import { getWorkspaceItemContent } from '../../../../core/domains/items/model/item';
import { screenToWorld } from '../../../../core/domains/layout/model/viewport';
import {
  BOX_TEMPLATE_LIBRARY,
  getBoxTemplateDefinition,
} from '../../../../core/domains/workspace/model/boxTemplates';
import {
  MAX_WORKSPACE_BOXES,
  type BoxTemplateId,
  type WorkspaceBox,
} from '../../../../core/domains/workspace/model/workspace';
import { getBoxDisplayTitle } from '../../../../core/domains/workspace/model/boxTitles';
import { getBoxItems } from '../../../../core/domains/workspace/model/workspaceSelectors';
import { getRuntimeViewport } from '../../../app/controllers/runtimeDocumentController';
import { useI18n } from '../../../app/hooks/useI18n';
import { useCanvasStore } from '../../../app/stores/useCanvasStore';
import { useInteractionStore } from '../../../app/stores/useInteractionStore';
import { useSettingsPanelStore } from '../../../app/stores/useSettingsPanelStore';
import {
  useVisibleBoxes,
  useWorkspaceDispatch,
  useWorkspaceSnapshot,
} from '../../../app/stores/useWorkspaceSelectors';
import { createWorkspaceBox } from '../../../app/use-cases/createWorkspaceBox';

function getSearchText(box: WorkspaceBox, title: string) {
  const template = getBoxTemplateDefinition(box.templateId);
  return `${title} ${box.templateId} ${template.titleKey} ${template.descriptionKey} ${
    template.actionKey
  }`.toLowerCase();
}

function runOptionalFocusAction(action: () => void) {
  try {
    action();
  } catch {
    // The desktop bridge is unavailable in browser-only previews; item focus still works without z-order persistence.
  }
}

export function useWorkspaceCommandCenter() {
  const { t } = useI18n();
  const snapshot = useWorkspaceSnapshot();
  const boxes = useVisibleBoxes();
  const dispatch = useWorkspaceDispatch();
  const setActiveBox = useInteractionStore((state) => state.setActiveBox);
  const setFocusedItemInfo = useInteractionStore((state) => state.setFocusedItemInfo);
  const centerOn = useCanvasStore((state) => state.centerOn);
  const panX = useCanvasStore((state) => state.panX);
  const panY = useCanvasStore((state) => state.panY);
  const openSettings = useSettingsPanelStore((state) => state.open);
  const [isTemplateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<BoxTemplateId>(
    BOX_TEMPLATE_LIBRARY[0].id,
  );
  const [query, setQuery] = useState('');
  const hasReachedBoxLimit = boxes.length >= MAX_WORKSPACE_BOXES;
  const normalizedQuery = query.trim().toLowerCase();
  const boxRows = useMemo(
    () =>
      boxes.map((box) => ({
        box,
        title: getBoxDisplayTitle(box, t),
      })),
    [boxes, t],
  );
  const filteredBoxRows = useMemo(
    () =>
      normalizedQuery
        ? boxRows.filter((row) => getSearchText(row.box, row.title).includes(normalizedQuery))
        : boxRows,
    [boxRows, normalizedQuery],
  );
  const itemRows = useMemo(
    () =>
      boxes.flatMap((box) => {
        const boxTitle = getBoxDisplayTitle(box, t);
        return getBoxItems(snapshot, box.id).map((item) => ({
          item,
          box,
          boxTitle,
          searchText: `${item.title} ${getWorkspaceItemContent(item)} ${boxTitle} ${
            box.templateId
          }`.toLowerCase(),
        }));
      }),
    [boxes, snapshot, t],
  );
  const filteredItemRows = useMemo(
    () =>
      normalizedQuery
        ? itemRows.filter((row) => row.searchText.includes(normalizedQuery))
        : itemRows.slice(0, 6),
    [itemRows, normalizedQuery],
  );

  const focusBox = (box: WorkspaceBox) => {
    setActiveBox(box.id);
    runOptionalFocusAction(() => {
      const viewport = getRuntimeViewport();
      centerOn(box.bounds.x + box.bounds.width / 2, box.bounds.y + box.bounds.height / 2, viewport);
      dispatch({ type: 'box.bringToFront', boxId: box.id });
    });
  };

  const focusItem = (box: WorkspaceBox, itemId: string) => {
    setActiveBox(box.id);
    setFocusedItemInfo({ boxId: box.id, itemId });
    runOptionalFocusAction(() => {
      const viewport = getRuntimeViewport();
      centerOn(box.bounds.x + box.bounds.width / 2, box.bounds.y + box.bounds.height / 2, viewport);
      dispatch({ type: 'box.bringToFront', boxId: box.id });
    });
  };

  const createTemplate = (templateId: BoxTemplateId) => {
    if (hasReachedBoxLimit) {
      return;
    }

    const viewport = getRuntimeViewport();
    const center = screenToWorld(
      { clientX: viewport.width / 2, clientY: viewport.height / 2 },
      { panX, panY },
    );
    const result = createWorkspaceBox({
      centerX: center.x,
      centerY: center.y,
      templateId,
    });

    if (result.status === 'created') {
      setActiveBox(result.box.id);
      setFocusedItemInfo(
        result.initialFocusItemId
          ? { boxId: result.box.id, itemId: result.initialFocusItemId }
          : null,
      );
      dispatch({ type: 'box.bringToFront', boxId: result.box.id });
      setTemplateMenuOpen(false);
    }
  };

  const selectedTemplate =
    BOX_TEMPLATE_LIBRARY.find((template) => template.id === selectedTemplateId) ??
    BOX_TEMPLATE_LIBRARY[0];

  return {
    query,
    setQuery,
    isTemplateMenuOpen,
    setTemplateMenuOpen,
    selectedTemplateId,
    setSelectedTemplateId,
    hasReachedBoxLimit,
    hasQuery: normalizedQuery.length > 0,
    filteredBoxRows,
    filteredItemRows,
    templates: BOX_TEMPLATE_LIBRARY.map((template) => ({
      id: template.id,
      label: t(template.titleKey),
      description: t(template.descriptionKey),
      action: t(template.actionKey),
      defaultLayout: template.defaultLayout,
    })),
    selectedTemplate: {
      id: selectedTemplate.id,
      label: t(selectedTemplate.titleKey),
      description: t(selectedTemplate.descriptionKey),
      action: t(selectedTemplate.actionKey),
      defaultLayout: selectedTemplate.defaultLayout,
      defaultBounds: selectedTemplate.defaultBounds,
    },
    labels: {
      createTemplate: t('workspace.createTemplate'),
      templatePicker: t('workspace.templatePicker'),
      searchPlaceholder: t('workspace.searchPlaceholder'),
      settings: t('settings.title'),
      navigator: t('workspace.navigator'),
      items: t('workspace.items'),
      noBoxes: t('workspace.noBoxes'),
      noItems: t('workspace.noItems'),
    },
    openSettings,
    focusBox,
    focusItem,
    createTemplate,
  };
}

export type WorkspaceCommandCenterController = ReturnType<typeof useWorkspaceCommandCenter>;

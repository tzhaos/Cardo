import { useMemo, useState } from 'react';
import { getWorkspaceItemContent } from '../../../../core/domains/items/model/item';
import { getFrequentBookmarks } from '../../../../core/domains/bookmarks/services/frequentBookmarks';
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
import { useInteractionStore } from '../../../app/stores/useInteractionStore';
import { useSettingsPanelStore } from '../../../app/stores/useSettingsPanelStore';
import {
  useVisibleBoxes,
  useWorkspaceDispatch,
  useWorkspaceSnapshot,
} from '../../../app/stores/useWorkspaceSelectors';
import { createWorkspaceBox } from '../../../app/use-cases/createWorkspaceBox';
import { openBookmark as openBookmarkUseCase } from '../../../app/use-cases/openBookmark';

interface UseWorkspaceCommandCenterOptions {
  onSelectTemplatePage?: (templateId: BoxTemplateId) => void;
  onRevealBox?: (boxId: string, itemId?: string) => void;
}

function getSearchText(box: WorkspaceBox, title: string) {
  const template = getBoxTemplateDefinition(box.templateId);
  return `${title} ${box.templateId} ${template.titleKey} ${template.descriptionKey} ${
    template.actionKey
  }`.toLowerCase();
}

export function useWorkspaceCommandCenter({
  onSelectTemplatePage,
  onRevealBox,
}: UseWorkspaceCommandCenterOptions = {}) {
  const { t } = useI18n();
  const snapshot = useWorkspaceSnapshot();
  const boxes = useVisibleBoxes();
  const dispatch = useWorkspaceDispatch();
  const setActiveBox = useInteractionStore((state) => state.setActiveBox);
  const setFocusedItemInfo = useInteractionStore((state) => state.setFocusedItemInfo);
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
  const frequentBookmarkRows = useMemo(
    () =>
      getFrequentBookmarks(Object.values(snapshot.bookmarksById), 6).map((bookmark) => ({
        bookmark,
        searchText: `${bookmark.title} ${bookmark.url} ${bookmark.tags.join(' ')}`.toLowerCase(),
      })),
    [snapshot.bookmarksById],
  );
  const filteredFrequentBookmarkRows = useMemo(
    () =>
      normalizedQuery
        ? frequentBookmarkRows.filter((row) => row.searchText.includes(normalizedQuery))
        : frequentBookmarkRows,
    [frequentBookmarkRows, normalizedQuery],
  );

  const focusBox = (box: WorkspaceBox) => {
    setActiveBox(box.id);
    setFocusedItemInfo(null);
    onSelectTemplatePage?.(box.templateId);
    dispatch({ type: 'box.bringToFront', boxId: box.id });
    onRevealBox?.(box.id);
  };

  const focusItem = (box: WorkspaceBox, itemId: string) => {
    setActiveBox(box.id);
    setFocusedItemInfo({ boxId: box.id, itemId });
    onSelectTemplatePage?.(box.templateId);
    dispatch({ type: 'box.bringToFront', boxId: box.id });
    onRevealBox?.(box.id, itemId);
  };

  const createTemplate = (templateId: BoxTemplateId) => {
    if (hasReachedBoxLimit) {
      return;
    }

    const viewport = getRuntimeViewport();
    const result = createWorkspaceBox({
      centerX: viewport.width / 2,
      centerY: viewport.height / 2,
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
      onSelectTemplatePage?.(result.box.templateId);
      onRevealBox?.(result.box.id, result.initialFocusItemId ?? undefined);
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
      close: t('settings.close'),
      navigator: t('workspace.navigator'),
      items: t('workspace.items'),
      frequentSites: t('workspace.frequentSites'),
      noBoxes: t('workspace.noBoxes'),
      noItems: t('workspace.noItems'),
      noFrequentSites: t('workspace.noFrequentSites'),
    },
    openSettings,
    focusBox,
    focusItem,
    openBookmark: openBookmarkUseCase,
    createTemplate,
    filteredFrequentBookmarkRows,
  };
}

export type WorkspaceCommandCenterController = ReturnType<typeof useWorkspaceCommandCenter>;

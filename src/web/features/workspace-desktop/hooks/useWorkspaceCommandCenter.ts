import { useMemo, useState } from 'react';
import { getWorkspaceItemContent } from '../../../../core/domains/items/model/item';
import { getFrequentBookmarks } from '../../../../core/domains/bookmarks/services/frequentBookmarks';
import { getBoxTemplateDefinition } from '../../../../core/domains/workspace/model/boxTemplates';
import {
  type BoxTemplateId,
  type WorkspaceBox,
} from '../../../../core/domains/workspace/model/workspace';
import { getBoxDisplayTitle } from '../../../../core/domains/workspace/model/boxTitles';
import { getBoxItems } from '../../../../core/domains/workspace/model/workspaceSelectors';
import { useI18n } from '../../../app/hooks/useI18n';
import { useInteractionStore } from '../../../app/stores/useInteractionStore';
import {
  useVisibleBoxes,
  useWorkspaceDispatch,
  useWorkspaceSnapshot,
} from '../../../app/stores/useWorkspaceSelectors';
import { openBookmark as openBookmarkUseCase } from '../../../app/use-cases/openBookmark';

interface UseWorkspaceCommandCenterOptions {
  onOpenSettings?: () => void;
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
  onOpenSettings,
  onSelectTemplatePage,
  onRevealBox,
}: UseWorkspaceCommandCenterOptions = {}) {
  const { t } = useI18n();
  const snapshot = useWorkspaceSnapshot();
  const boxes = useVisibleBoxes();
  const dispatch = useWorkspaceDispatch();
  const setActiveBox = useInteractionStore((state) => state.setActiveBox);
  const setFocusedItemInfo = useInteractionStore((state) => state.setFocusedItemInfo);
  const [query, setQuery] = useState('');
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

  return {
    query,
    setQuery,
    hasQuery: normalizedQuery.length > 0,
    filteredBoxRows,
    filteredItemRows,
    labels: {
      searchPlaceholder: t('workspace.searchPlaceholder'),
      settings: t('settings.title'),
      navigator: t('workspace.navigator'),
      items: t('workspace.items'),
      frequentSites: t('workspace.frequentSites'),
      noBoxes: t('workspace.noBoxes'),
      noItems: t('workspace.noItems'),
      noFrequentSites: t('workspace.noFrequentSites'),
    },
    openSettings: () => onOpenSettings?.(),
    focusBox,
    focusItem,
    openBookmark: openBookmarkUseCase,
    filteredFrequentBookmarkRows,
  };
}

export type WorkspaceCommandCenterController = ReturnType<typeof useWorkspaceCommandCenter>;

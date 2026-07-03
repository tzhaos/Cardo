import { useMemo, useState } from 'react';
import { createDefaultTemplateState } from '../../../../core/domains/workspace/model/boxTemplates';
import { getBoxDisplayTitle } from '../../../../core/domains/workspace/model/boxTitles';
import {
  isKanbanTemplateId,
  type WorkspaceBox,
} from '../../../../core/domains/workspace/model/workspace';
import { useI18n } from '../../../app/hooks/useI18n';
import { presentToastSpec } from '../../../app/presentation/toastSpec';
import { useInteractionStore } from '../../../app/stores/useInteractionStore';
import { useVisibleBoxes, useWorkspaceDispatch } from '../../../app/stores/useWorkspaceSelectors';
import { moveItemToBox } from '../../../app/use-cases/moveItemToBox';
import {
  pushRecentInboxRouteTargetId,
  sectionInboxRouteTargets,
  type InboxRouteTarget,
} from '../services/inboxRouteTargets';
import { useManagedBoxContent } from './useManagedBoxContent';

function getKanbanColumns(box: WorkspaceBox) {
  const columns = box.templateState.kanbanColumns;
  return columns && columns.length > 0
    ? columns
    : (createDefaultTemplateState(box.templateId).kanbanColumns ?? []);
}

function suppressOptionalFocusError(action: () => void) {
  try {
    action();
  } catch {
    // Browser-only previews cannot persist z-order without the desktop bridge.
  }
}

export function useManagedInboxContent(
  box: WorkspaceBox,
  showAddMenu: boolean,
  setShowAddMenu: (show: boolean) => void,
) {
  const { t } = useI18n();
  const base = useManagedBoxContent(box, showAddMenu, setShowAddMenu);
  const boxes = useVisibleBoxes();
  const dispatch = useWorkspaceDispatch();
  const setActiveBox = useInteractionStore((state) => state.setActiveBox);
  const setFocusedItemInfo = useInteractionStore((state) => state.setFocusedItemInfo);
  const [openRouteItemId, setOpenRouteItemId] = useState<string | null>(null);
  const [routeSearchQuery, setRouteSearchQuery] = useState('');
  const [recentRouteTargetIds, setRecentRouteTargetIds] = useState<string[]>([]);
  const routeTargets = useMemo(
    () =>
      boxes.flatMap((candidate): InboxRouteTarget[] => {
        if (candidate.id === box.id) {
          return [];
        }

        const boxTitle = getBoxDisplayTitle(candidate, t);

        if (!isKanbanTemplateId(candidate.templateId)) {
          return [
            {
              id: candidate.id,
              label: boxTitle,
              boxId: candidate.id,
              boxLabel: boxTitle,
              searchText: `${boxTitle} ${candidate.templateId}`,
            },
          ];
        }

        return getKanbanColumns(candidate).map((column) => ({
          id: `${candidate.id}:${column.id}`,
          label: `${boxTitle} / ${column.title}`,
          boxId: candidate.id,
          boxLabel: boxTitle,
          columnId: column.id,
          columnLabel: column.title,
          searchText: `${boxTitle} ${candidate.templateId} ${column.title}`,
        }));
      }),
    [box.id, boxes, t],
  );
  const routeTargetSections = useMemo(
    () => sectionInboxRouteTargets(routeTargets, recentRouteTargetIds, routeSearchQuery),
    [recentRouteTargetIds, routeSearchQuery, routeTargets],
  );

  const closeRoutePicker = () => {
    setOpenRouteItemId(null);
    setRouteSearchQuery('');
  };

  return {
    ...base,
    routeTargets,
    routeTargetSections,
    routeSearchQuery,
    setRouteSearchQuery,
    openRouteItemId,
    labels: {
      routePlaceholder: t('inbox.routePlaceholder'),
      routeSearchPlaceholder: t('inbox.routeSearchPlaceholder'),
      recentDestinations: t('inbox.recentDestinations'),
      allDestinations: t('inbox.allDestinations'),
      noDestinations: t('inbox.noDestinations'),
      noMatchingDestinations: t('inbox.noMatchingDestinations'),
      columnTarget: (column: string) => t('inbox.columnTarget', { column }),
      empty: t('inbox.empty'),
    },
    toggleRoutePicker: (itemId: string) => {
      setOpenRouteItemId(openRouteItemId === itemId ? null : itemId);
      setRouteSearchQuery('');
    },
    closeRoutePicker,
    routeItem: (itemId: string, targetId: string) => {
      const target = routeTargets.find((candidate) => candidate.id === targetId);

      if (!target) {
        return;
      }

      moveItemToBox(itemId, box.id, target.boxId, undefined, target.columnId);
      setActiveBox(target.boxId);
      setFocusedItemInfo({ boxId: target.boxId, itemId });
      suppressOptionalFocusError(() => {
        dispatch({ type: 'box.bringToFront', boxId: target.boxId });
      });
      setRecentRouteTargetIds((targetIds) => pushRecentInboxRouteTargetId(targetIds, target.id));
      closeRoutePicker();
      presentToastSpec(t, {
        level: 'success',
        messageKey: 'toast.movedItemToTarget',
        params: { target: target.label },
      });
    },
  };
}

export type ManagedInboxContentController = ReturnType<typeof useManagedInboxContent>;

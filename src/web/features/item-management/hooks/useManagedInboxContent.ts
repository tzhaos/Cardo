import { useMemo } from 'react';
import { createDefaultTemplateState } from '../../../../core/domains/workspace/model/boxTemplates';
import { getBoxDisplayTitle } from '../../../../core/domains/workspace/model/boxTitles';
import type { WorkspaceBox } from '../../../../core/domains/workspace/model/workspace';
import { useI18n } from '../../../app/hooks/useI18n';
import { presentToastSpec } from '../../../app/presentation/toastSpec';
import { useInteractionStore } from '../../../app/stores/useInteractionStore';
import { useVisibleBoxes, useWorkspaceDispatch } from '../../../app/stores/useWorkspaceSelectors';
import { moveItemToBox } from '../../../app/use-cases/moveItemToBox';
import { useManagedBoxContent } from './useManagedBoxContent';

interface InboxRouteTarget {
  id: string;
  label: string;
  boxId: string;
  columnId?: string;
}

function getKanbanColumns(box: WorkspaceBox) {
  const columns = box.templateState.kanbanColumns;
  return columns && columns.length > 0
    ? columns
    : (createDefaultTemplateState('kanban').kanbanColumns ?? []);
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
  const routeTargets = useMemo(
    () =>
      boxes.flatMap((candidate): InboxRouteTarget[] => {
        if (candidate.id === box.id) {
          return [];
        }

        const boxTitle = getBoxDisplayTitle(candidate, t);

        if (candidate.templateId !== 'kanban') {
          return [
            {
              id: candidate.id,
              label: boxTitle,
              boxId: candidate.id,
            },
          ];
        }

        return getKanbanColumns(candidate).map((column) => ({
          id: `${candidate.id}:${column.id}`,
          label: `${boxTitle} / ${column.title}`,
          boxId: candidate.id,
          columnId: column.id,
        }));
      }),
    [box.id, boxes, t],
  );

  return {
    ...base,
    routeTargets,
    labels: {
      routePlaceholder: t('inbox.routePlaceholder'),
      noDestinations: t('inbox.noDestinations'),
      empty: t('inbox.empty'),
    },
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
      presentToastSpec(t, {
        level: 'success',
        messageKey: 'toast.movedItemToTarget',
        params: { target: target.label },
      });
    },
  };
}

export type ManagedInboxContentController = ReturnType<typeof useManagedInboxContent>;

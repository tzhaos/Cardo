import {
  MAX_WORKSPACE_BOXES,
  type BoxItemPlacement,
  type BoxTemplateId,
  type WorkspaceBox,
} from '../../../core/domains/workspace/model/workspace';
import { createWorkspaceBoxCommand } from '../../../core/services/workspaceActions';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { createId } from './createId';

export type CreateWorkspaceBoxResult =
  | {
      status: 'created';
      box: WorkspaceBox;
      createdItemIds: string[];
      initialFocusItemId: string | null;
    }
  | { status: 'limit-reached'; limit: number };

export function getInitialFocusItemId(placements: BoxItemPlacement[] = []) {
  return (
    placements.find((placement) => placement.isPinned)?.itemId ?? placements[0]?.itemId ?? null
  );
}

export function createWorkspaceBox(placement: {
  centerX: number;
  centerY: number;
  templateId?: BoxTemplateId;
}) {
  const { snapshot, dispatch } = useWorkspaceStore.getState();
  const result = createWorkspaceBoxCommand(snapshot, placement, createId);

  if (result.status === 'limit-reached') {
    return {
      status: 'limit-reached' as const,
      limit: MAX_WORKSPACE_BOXES,
    };
  }

  dispatch(result.command);

  return {
    status: 'created' as const,
    box: result.box,
    createdItemIds: result.command.items?.map((item) => item.id) ?? [],
    initialFocusItemId: getInitialFocusItemId(result.command.placements),
  };
}

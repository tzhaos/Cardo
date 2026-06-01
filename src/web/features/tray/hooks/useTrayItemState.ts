import { useI18n } from '../../../app/hooks/useI18n';
import { useInteractionStore } from '../../../app/stores/useInteractionStore';
import { getBoxDisplayTitle } from '../../../../core/domains/workspace/model/boxTitles';
import type { WorkspaceBox } from '../../../../core/domains/workspace/model/workspace';

export function useTrayItemState(box: WorkspaceBox) {
  const { t } = useI18n();
  const boxTransition = useInteractionStore((state) => state.boxTransition);
  const displayTitle = getBoxDisplayTitle(box, t);
  const isVisible = !box.isMinimized;
  const isTransitionTarget = boxTransition?.boxId === box.id;
  const isReceivingBox = isTransitionTarget && boxTransition.kind === 'minimize';
  const isLaunchingBox = isTransitionTarget && boxTransition.kind === 'restore';

  return {
    displayTitle,
    isVisible,
    isReceivingBox,
    isLaunchingBox,
    isTransitioning: isReceivingBox || isLaunchingBox,
  };
}

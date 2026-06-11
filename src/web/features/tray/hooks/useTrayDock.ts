import { useI18n } from '../../../app/hooks/useI18n';
import { clearBoxTransitionIfActive } from '../../../app/controllers/interactionController';
import { getRuntimeViewport } from '../../../app/controllers/runtimeDocumentController';
import { screenToWorld } from '../../../../core/domains/layout/model/viewport';
import { useInteractionStore } from '../../../app/stores/useInteractionStore';
import { useCanvasStore } from '../../../app/stores/useCanvasStore';
import { useSettingsPanelStore } from '../../../app/stores/useSettingsPanelStore';
import { useTrayBoxes, useWorkspaceDispatch } from '../../../app/stores/useWorkspaceSelectors';
import { createWorkspaceBox } from '../../../app/use-cases/createWorkspaceBox';
import { MAX_WORKSPACE_BOXES } from '../../../../core/domains/workspace/model/workspace';

function getDockTransitionRect(boxId: string) {
  const dockItem = document.getElementById(`dock-box-${boxId}`);

  if (!dockItem) {
    return null;
  }

  const rect = dockItem.getBoundingClientRect();

  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

export function useTrayDock() {
  const { t } = useI18n();
  const openSettings = useSettingsPanelStore((state) => state.open);
  const boxes = useTrayBoxes();
  const dispatch = useWorkspaceDispatch();
  const setActiveBox = useInteractionStore((state) => state.setActiveBox);
  const setBoxTransition = useInteractionStore((state) => state.setBoxTransition);
  const panX = useCanvasStore((state) => state.panX);
  const panY = useCanvasStore((state) => state.panY);
  const isCompact = boxes.length >= 7;
  const hasReachedBoxLimit = boxes.length >= MAX_WORKSPACE_BOXES;

  return {
    boxes,
    isCompact,
    hasReachedBoxLimit,
    createBoxLabel: hasReachedBoxLimit
      ? t('dock.createBoxLimitReached', { limit: MAX_WORKSPACE_BOXES })
      : t('dock.createBox'),
    settingsLabel: t('settings.title'),
    openSettings,
    createBox: () => {
      const viewport = getRuntimeViewport();
      const center = screenToWorld(
        { clientX: viewport.width / 2, clientY: viewport.height / 2 },
        { panX, panY },
      );
      const result = createWorkspaceBox({
        centerX: center.x,
        centerY: center.y,
      });

      if (result.status === 'limit-reached') {
        return;
      }

      setActiveBox(result.box.id);
    },
    toggleBoxMinimized: (boxId: string) => {
      const box = boxes.find((candidate) => candidate.id === boxId);

      if (!box) {
        return;
      }

      const nextIsMinimized = !box.isMinimized;

      if (!nextIsMinimized) {
        dispatch({ type: 'box.bringToFront', boxId });
        setActiveBox(boxId);
        setBoxTransition({
          boxId,
          kind: 'restore',
          dockRect: getDockTransitionRect(boxId),
        });

        window.setTimeout(() => {
          clearBoxTransitionIfActive(boxId);
        }, 420);
      }

      dispatch({
        type: 'box.update',
        boxId,
        updates: { isMinimized: nextIsMinimized },
      });
    },
  };
}

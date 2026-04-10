import { Plus, Settings } from 'lucide-react';
import { useI18n } from '../../../app/hooks/useI18n';
import { runtimeDocumentPort } from '../../../app/ports/defaultPorts';
import { createWorkspaceBox } from '../../../app/use-cases/createWorkspaceBox';
import { useInteractionStore } from '../../../app/stores/useInteractionStore';
import { useSettingsPanelStore } from '../../../app/stores/useSettingsPanelStore';
import { useTrayBoxes, useWorkspaceDispatch } from '../../../app/stores/useWorkspaceSelectors';
import { MAX_WORKSPACE_BOXES } from '../../../domains/workspace/model/workspace';
import TrayItemButton from './TrayItemButton';

export default function TrayDock() {
  const { t } = useI18n();
  const openSettings = useSettingsPanelStore((state) => state.open);
  const boxes = useTrayBoxes();
  const dispatch = useWorkspaceDispatch();
  const setActiveBox = useInteractionStore((state) => state.setActiveBox);
  const setBoxTransition = useInteractionStore((state) => state.setBoxTransition);
  const isCompact = boxes.length >= 7;
  const hasReachedBoxLimit = boxes.length >= MAX_WORKSPACE_BOXES;

  const getDockTransitionRect = (boxId: string) => {
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
  };

  const handleCreateBox = () => {
    const result = createWorkspaceBox(runtimeDocumentPort.getViewport());

    if (result.status === 'limit-reached') {
      return;
    }

    setActiveBox(result.box.id);
  };

  return (
    <div className="fixed bottom-4 left-1/2 z-[99990] w-[min(calc(100vw-1.5rem),72rem)] -translate-x-1/2">
      <div className="kb-dock flex items-center gap-1 rounded-2xl p-1.5">
        <div className="min-w-0 flex-1">
          <div className="custom-scrollbar overflow-x-auto overflow-y-hidden">
            <div className="flex min-w-max items-center gap-1 pr-1">
              {boxes.map((box) => (
                <TrayItemButton
                  key={box.id}
                  box={box}
                  compact={isCompact}
                  onClick={() => {
                    const nextIsMinimized = !box.isMinimized;

                    if (!nextIsMinimized) {
                      dispatch({ type: 'box.bringToFront', boxId: box.id });
                      setActiveBox(box.id);
                      setBoxTransition({
                        boxId: box.id,
                        kind: 'restore',
                        dockRect: getDockTransitionRect(box.id),
                      });

                      window.setTimeout(() => {
                        const currentTransition = useInteractionStore.getState().boxTransition;

                        if (currentTransition?.boxId === box.id) {
                          useInteractionStore.getState().setBoxTransition(null);
                        }
                      }, 420);
                    }

                    dispatch({
                      type: 'box.update',
                      boxId: box.id,
                      updates: { isMinimized: nextIsMinimized },
                    });
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mx-1 h-6 w-px shrink-0 bg-win-border" />

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleCreateBox}
            disabled={hasReachedBoxLimit}
            title={
              hasReachedBoxLimit
                ? t('dock.createBoxLimitReached', { limit: MAX_WORKSPACE_BOXES })
                : t('dock.createBox')
            }
            aria-label={
              hasReachedBoxLimit
                ? t('dock.createBoxLimitReached', { limit: MAX_WORKSPACE_BOXES })
                : t('dock.createBox')
            }
            className="kb-dock-action flex h-10 w-10 items-center justify-center rounded-lg transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={20} className="text-win-text-secondary" />
          </button>

          <button
            onClick={openSettings}
            title={t('settings.title')}
            aria-label={t('settings.title')}
            className="kb-dock-action flex h-10 w-10 items-center justify-center rounded-lg transition-all active:scale-95"
          >
            <Settings size={20} className="text-win-text-secondary" />
          </button>
        </div>
      </div>
    </div>
  );
}

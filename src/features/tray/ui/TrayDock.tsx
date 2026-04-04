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
  const isCompact = boxes.length >= 7;
  const hasReachedBoxLimit = boxes.length >= MAX_WORKSPACE_BOXES;

  const handleCreateBox = () => {
    const result = createWorkspaceBox(runtimeDocumentPort.getViewport());

    if (result.status === 'limit-reached') {
      return;
    }

    setActiveBox(result.box.id);
  };

  return (
    <div className="fixed bottom-6 left-1/2 z-[99990] w-[min(calc(100vw-1.5rem),72rem)] -translate-x-1/2">
      <div className="kb-dock flex items-center gap-3 rounded-2xl border px-3 py-2 backdrop-blur-md">
        <div className="min-w-0 flex-1">
          <div className="custom-scrollbar overflow-x-auto overflow-y-hidden">
            <div className="flex min-w-max items-center gap-2 pr-1">
              {boxes.map((box) => (
                <TrayItemButton
                  key={box.id}
                  box={box}
                  compact={isCompact}
                  onClick={() => {
                    dispatch({
                      type: 'box.update',
                      boxId: box.id,
                      updates: { isMinimized: !box.isMinimized },
                    });
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="kb-dock-divider h-8 w-px shrink-0" />

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
            className="kb-dock-action rounded-xl p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={20} />
          </button>

          <button
            onClick={openSettings}
            title={t('settings.title')}
            aria-label={t('settings.title')}
            className="kb-dock-action rounded-xl p-2 transition-colors"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

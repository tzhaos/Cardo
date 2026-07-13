import { useCanvasStore } from '../app/stores/canvasStore';
import { useWorkspaceStore } from '../app/stores/workspaceStore';
import { IconButton } from '../kit/icon-button';
import { ThemeIcon } from '../kit/icon';
import {
  constrainBoxFrameToCanvas,
  createCanvasWorldBounds,
  getCanvasViewportCenter,
} from '../domain/canvasGeometry';
import { createBoxFrameCenteredAt } from '../domain/placement';
import { isSystemPageId } from '../domain/workspace';
import { useI18n } from '../i18n/useI18n';

const TOOLBAR_ICON_SIZE = 18;

/**
 * Panel-bottom tools: create box only.
 * Local search is a left-sidebar nav entry that opens SearchPage — not a bottom pill.
 * Parent FeatureGate chrome.bottomToolbar.
 */
export function BottomActionBar() {
  const createBox = useWorkspaceStore((state) => state.createBox);
  const activePageId = useWorkspaceStore((state) => state.projection.activePageId);
  const { t } = useI18n();

  const handleAdd = () => {
    const canvas = useCanvasStore.getState();
    const camera = canvas.pages[activePageId]?.camera ?? { panX: 0, panY: 0 };
    const viewportSize = canvas.viewportSize;
    const center = getCanvasViewportCenter({ panX: camera.panX, panY: camera.panY }, viewportSize);
    const frame = constrainBoxFrameToCanvas(
      createBoxFrameCenteredAt(center),
      createCanvasWorldBounds(viewportSize),
    );
    createBox(frame, t('box.general'));
  };

  if (isSystemPageId(activePageId)) {
    return null;
  }

  return (
    <div className="cardo-v2-bottom-shell">
      <div className="cardo-v2-bottom-bar" aria-label={t('toolbar.workspaceTools')}>
        <IconButton
          className="cardo-toolbar-create"
          onClick={handleAdd}
          tooltip={t('shell.createBox')}
          aria-label={t('shell.createBox')}
        >
          <span className="cardo-icon-frame">
            <ThemeIcon name="add" size={TOOLBAR_ICON_SIZE} />
          </span>
        </IconButton>
      </div>
    </div>
  );
}

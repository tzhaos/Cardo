import { useI18n } from '../../i18n/useI18n';
import { IconButton } from '../../ui/cardo/icon-button';
import { useCanvasTools } from './useCanvasTools';

export function CanvasToolsToolbar() {
  const { isLocked, items } = useCanvasTools();
  const { t } = useI18n();

  return (
    <aside className="cardo-canvas-tools" aria-label={t('canvas.layoutTools')}>
      {items.map((item) => (
        <IconButton
          className={
            item.id === 'toggle-canvas-lock' && isLocked
              ? 'cardo-canvas-tools-button-active'
              : undefined
          }
          disabled={item.disabled}
          key={item.id}
          aria-label={item.label}
          aria-pressed={item.id === 'toggle-canvas-lock' ? isLocked : undefined}
          tooltip={item.label}
          onClick={() => item.onSelect?.()}
        >
          {item.icon}
        </IconButton>
      ))}
    </aside>
  );
}

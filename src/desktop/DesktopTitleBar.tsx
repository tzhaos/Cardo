import { useEffect, useState, type ReactNode } from 'react';
import { Maximize2, Minus, Square, X } from 'lucide-react';
import { useI18n } from '../web/i18n/useI18n';

/**
 * Desktop window chrome only: leading product controls slot + window buttons.
 * Product name lives in the sidebar (SidebarBrand) — no logo / brand here.
 * Window controls are plain buttons (class-only) so kit Button pill styles do not apply.
 */
export default function DesktopTitleBar({ leading }: { leading?: ReactNode }) {
  const [isMaximized, setMaximized] = useState(false);
  const bridge = typeof window === 'undefined' ? undefined : window.cardoDesktop;
  const { t } = useI18n();

  useEffect(() => {
    if (!bridge) {
      return;
    }

    let isMounted = true;

    void bridge.isWindowMaximized().then((nextIsMaximized) => {
      if (isMounted) {
        setMaximized(nextIsMaximized);
      }
    });

    const unsubscribe = bridge.onWindowMaximizedChange(setMaximized);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [bridge]);

  if (!bridge) {
    return null;
  }

  return (
    <header
      className="cardo-desktop-titlebar"
      onDoubleClick={() => void bridge.toggleMaximizeWindow()}
    >
      <div className="cardo-desktop-titlebar-leading">{leading}</div>
      <div className="cardo-desktop-titlebar-drag" aria-hidden />
      <div
        className="cardo-desktop-window-controls"
        onDoubleClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="cardo-desktop-window-control"
          title={t('desktop.minimize')}
          aria-label={t('desktop.minimize')}
          onClick={() => void bridge.minimizeWindow()}
        >
          <Minus size={14} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          className="cardo-desktop-window-control"
          title={t(isMaximized ? 'desktop.restore' : 'desktop.maximize')}
          aria-label={t(isMaximized ? 'desktop.restore' : 'desktop.maximize')}
          onClick={async () => setMaximized(await bridge.toggleMaximizeWindow())}
        >
          {isMaximized ? <Maximize2 size={13} strokeWidth={1.8} /> : <Square size={12} />}
        </button>
        <button
          type="button"
          className="cardo-desktop-window-control cardo-desktop-window-control-close"
          title={t('desktop.close')}
          aria-label={t('desktop.close')}
          onClick={() => void bridge.closeWindow()}
        >
          <X size={15} strokeWidth={1.8} />
        </button>
      </div>
    </header>
  );
}

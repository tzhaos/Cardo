import { useEffect, useState } from 'react';
import { Box, Maximize2, Minus, Square, X } from 'lucide-react';
import { useI18n } from '../web-next/i18n/useI18n';
import { Button } from '../web-next/ui/primitives/button';

export default function DesktopTitleBar() {
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
      className="wbn-desktop-titlebar"
      onDoubleClick={() => void bridge.toggleMaximizeWindow()}
    >
      <div className="wbn-desktop-titlebar-brand">
        <Box size={15} />
        <span>Cardo</span>
      </div>
      <div
        className="wbn-desktop-window-controls"
        onDoubleClick={(event) => event.stopPropagation()}
      >
        <Button
          variant="ghost"
          className="wbn-desktop-window-control"
          title={t('desktop.minimize')}
          aria-label={t('desktop.minimize')}
          onClick={() => void bridge.minimizeWindow()}
        >
          <Minus size={14} strokeWidth={1.8} />
        </Button>
        <Button
          variant="ghost"
          className="wbn-desktop-window-control"
          title={t(isMaximized ? 'desktop.restore' : 'desktop.maximize')}
          aria-label={t(isMaximized ? 'desktop.restore' : 'desktop.maximize')}
          onClick={async () => setMaximized(await bridge.toggleMaximizeWindow())}
        >
          {isMaximized ? <Maximize2 size={13} strokeWidth={1.8} /> : <Square size={12} />}
        </Button>
        <Button
          variant="ghost"
          className="wbn-desktop-window-control wbn-desktop-window-control-close"
          title={t('desktop.close')}
          aria-label={t('desktop.close')}
          onClick={() => void bridge.closeWindow()}
        >
          <X size={15} strokeWidth={1.8} />
        </Button>
      </div>
    </header>
  );
}

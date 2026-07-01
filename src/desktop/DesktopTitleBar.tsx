import { useEffect, useState } from 'react';
import { Maximize2, Minus, Square, X } from 'lucide-react';
import { getDesktopBridge } from './bridge';

export default function DesktopTitleBar() {
  const [isMaximized, setMaximized] = useState(false);
  const bridge = getDesktopBridge();

  useEffect(() => {
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

  return (
    <header
      className="kb-desktop-titlebar flex h-10 shrink-0 items-center border-b border-win-border bg-win-mica text-win-text"
      onDoubleClick={() => void bridge.toggleMaximizeWindow()}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 px-3">
        <div className="h-3 w-3 rounded-sm bg-win-accent" />
        <span className="truncate text-xs font-semibold tracking-normal">KhaosBox</span>
      </div>
      <div
        className="kb-desktop-window-controls flex h-full"
        onDoubleClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="kb-window-control"
          title="Minimize"
          aria-label="Minimize"
          onClick={() => void bridge.minimizeWindow()}
        >
          <Minus size={14} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          className="kb-window-control"
          title={isMaximized ? 'Restore' : 'Maximize'}
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
          onClick={async () => setMaximized(await bridge.toggleMaximizeWindow())}
        >
          {isMaximized ? <Maximize2 size={13} strokeWidth={1.8} /> : <Square size={12} />}
        </button>
        <button
          type="button"
          className="kb-window-control kb-window-control-close"
          title="Close"
          aria-label="Close"
          onClick={() => void bridge.closeWindow()}
        >
          <X size={15} strokeWidth={1.8} />
        </button>
      </div>
    </header>
  );
}

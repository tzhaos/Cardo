import '../web/index.css';
import KhaosBoxApp from '../web/app/KhaosBoxApp';
import { renderRoot } from '../web/app/bootstrap/renderRoot';
import { configureAppPorts } from '../web/app/ports/defaultPorts';
import { createDesktopPorts } from './ports/createDesktopPorts';
import DesktopTitleBar from './DesktopTitleBar';

configureAppPorts(createDesktopPorts());

renderRoot(
  <div className="flex h-full min-h-0 flex-col overflow-hidden">
    <DesktopTitleBar />
    <main className="min-h-0 flex-1">
      <KhaosBoxApp />
    </main>
  </div>,
);

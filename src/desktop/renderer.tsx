import '../web/index.css';
import KhaosBoxApp from '../web/app/KhaosBoxApp';
import { renderRoot } from '../web/app/bootstrap/renderRoot';
import { configureAppPorts } from '../web/app/ports/defaultPorts';
import { createDesktopPorts } from './ports/createDesktopPorts';

configureAppPorts(createDesktopPorts());

renderRoot(
  <div className="h-full min-h-0 overflow-hidden">
    <KhaosBoxApp />
  </div>,
);

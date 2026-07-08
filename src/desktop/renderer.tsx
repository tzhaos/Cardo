import '../web/index.css';
import KhaosBoxApp from '../web/app/KhaosBoxApp';
import { renderRoot } from '../web/app/bootstrap/renderRoot';
import { configureAppPorts } from '../web/app/ports/defaultPorts';
import { createDesktopPorts } from './ports/createDesktopPorts';

configureAppPorts(createDesktopPorts());

renderRoot(
  <div className="min-h-screen overflow-x-hidden">
    <KhaosBoxApp />
  </div>,
);

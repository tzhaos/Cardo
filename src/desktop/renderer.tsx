import { configureAppPorts } from '../core/runtime/appPorts';
import { startWebNextApp } from '../web-next/app/start';
import { createDesktopPorts } from './ports/createDesktopPorts';

configureAppPorts(createDesktopPorts());
startWebNextApp();

import { configureAppPorts } from '../../core/runtime/appPorts';
import { startWebNextApp } from '../../web-next/app/start';
import { createExtensionPorts } from '../ports/createExtensionPorts';

configureAppPorts(createExtensionPorts());
startWebNextApp();

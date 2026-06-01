import '../../web/index.css';
import { configureAppPorts } from '../../web/app/ports/defaultPorts';
import { renderRoot } from '../../web/app/bootstrap/renderRoot';
import { createExtensionPorts } from '../ports/createExtensionPorts';

configureAppPorts(createExtensionPorts());

void import('../../web/app/KhaosBoxApp').then(({ default: KhaosBoxApp }) => {
  renderRoot(<KhaosBoxApp />);
});

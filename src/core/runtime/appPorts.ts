import type { AppPorts } from '../ports/AppPorts';

function createDefaultAppPorts(): AppPorts {
  return {
    database: {
      execute: async () => {
        throw new Error('Database port is not configured.');
      },
    },
    clipboard: {
      readText: async () => '',
      writeText: async () => {},
    },
    fileExport: {
      downloadJson: () => {},
      downloadText: () => {},
    },
    tabs: {
      openUrl: () => {},
    },
    localResource: {
      requestOpen: () => ({
        status: 'failed',
        errorMessage: 'Local resource port is not configured.',
      }),
    },
    websiteIcons: {
      resolve: async () => null,
    },
  };
}

let activePorts: AppPorts = createDefaultAppPorts();

export function configureAppPorts(ports: AppPorts) {
  activePorts = ports;
}

export function getAppPorts() {
  return activePorts;
}

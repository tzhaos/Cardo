import type { WorkspaceStoragePort } from '../../app/ports/WorkspaceStoragePort';
import { extensionStateStorage } from './stateStorage';

export const chromeWorkspaceStoragePort: WorkspaceStoragePort = extensionStateStorage;

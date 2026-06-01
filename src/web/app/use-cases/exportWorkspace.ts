import { exportWorkspaceSnapshot } from '../../../core/services/workspaceActions';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { fileExportPort } from '../ports/defaultPorts';

export function exportWorkspace(filenamePrefix: string) {
  exportWorkspaceSnapshot(useWorkspaceStore.getState().snapshot, fileExportPort, filenamePrefix);
}

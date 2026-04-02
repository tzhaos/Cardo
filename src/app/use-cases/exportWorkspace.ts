import { createWorkspaceExportDocument } from '../../domains/workspace/model/workspaceCodec';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { fileExportPort } from '../ports/defaultPorts';

export function exportWorkspace(filenamePrefix: string) {
  const payload = JSON.stringify(
    createWorkspaceExportDocument(useWorkspaceStore.getState().snapshot),
    null,
    2,
  );
  const filename = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.json`;

  fileExportPort.downloadJson(filename, payload);
}

import { log } from '../../../core/log';
import { readWorkspaceImportDocument } from '../../../core/services/workspaceActions';
import { createWorkspaceSnapshotFromExportDocument } from '../../../core/domains/workspace/model/workspaceCodec';
import { fileImportPort } from '../ports/defaultPorts';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';

export async function importWorkspace(file: unknown) {
  try {
    const importedDocument = await readWorkspaceImportDocument(file, fileImportPort);

    useWorkspaceStore.getState().dispatch({
      type: 'workspace.replace',
      snapshot: createWorkspaceSnapshotFromExportDocument(importedDocument),
    });

    return importedDocument;
  } catch (error) {
    log.error('Workspace import failed', error);
    throw error;
  }
}

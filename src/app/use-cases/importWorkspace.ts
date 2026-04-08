import { parseWorkspaceExportDocument } from '../../domains/workspace/model/workspaceCodec';
import { log } from '../../lib/log';
import { fileImportPort } from '../ports/defaultPorts';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';

export async function importWorkspace(file: File) {
  try {
    const fileContents = await fileImportPort.readText(file);
    const importedDocument = parseWorkspaceExportDocument(JSON.parse(fileContents) as unknown);

    useWorkspaceStore.getState().dispatch({
      type: 'workspace.replaceBoxes',
      boxes: importedDocument.boxes,
    });

    return importedDocument;
  } catch (error) {
    log.error('Workspace import failed', error);
    throw error;
  }
}

import type { FileExportPort } from '../../core/ports/FileExportPort';
import { log } from '../../core/log';

function downloadTextFile(filename: string, payload: string, mimeType: string) {
  try {
    const blob = new Blob([payload], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    log.error('Failed to download file', error);
  }
}

export const browserFileExportPort: FileExportPort = {
  downloadJson(filename, payload) {
    downloadTextFile(filename, payload, 'application/json');
  },
  downloadText(filename, payload, mimeType) {
    downloadTextFile(filename, payload, mimeType);
  },
};

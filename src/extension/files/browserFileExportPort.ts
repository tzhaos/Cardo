import type { FileExportPort } from '../../app/ports/FileExportPort';
import { log } from '../../lib/log';

export const browserFileExportPort: FileExportPort = {
  downloadJson(filename, payload) {
    try {
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');

      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      log.error('Failed to download JSON file', error);
    }
  },
};

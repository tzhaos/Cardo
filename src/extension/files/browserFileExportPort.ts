import type { FileExportPort } from '../../app/ports/FileExportPort';

export const browserFileExportPort: FileExportPort = {
  downloadJson(filename, payload) {
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  },
};

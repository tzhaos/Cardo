import type { FileImportPort } from '../../core/ports/FileImportPort';

export const browserFileImportPort: FileImportPort = {
  async readText(source) {
    if (!(source instanceof File)) {
      throw new Error('Browser file import requires a File object.');
    }

    return source.text();
  },
};

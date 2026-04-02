import type { FileImportPort } from '../../app/ports/FileImportPort';

export const browserFileImportPort: FileImportPort = {
  async readText(file) {
    return file.text();
  },
};

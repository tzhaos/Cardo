/** Port for exporting workspace data as downloadable files. */
export interface FileExportPort {
  downloadJson(filename: string, payload: string): void;
  downloadText(filename: string, payload: string, mimeType: string): void;
}

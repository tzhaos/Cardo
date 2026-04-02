export interface FileExportPort {
  downloadJson(filename: string, payload: string): void;
}

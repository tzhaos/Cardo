export interface FileImportPort {
  readText(file: File): Promise<string>;
}

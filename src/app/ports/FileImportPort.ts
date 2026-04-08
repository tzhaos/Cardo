/** Port for reading user-selected files during workspace import. */
export interface FileImportPort {
  readText(file: File): Promise<string>;
}

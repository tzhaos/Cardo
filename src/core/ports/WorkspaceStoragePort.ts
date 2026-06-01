/** Port for persistent key-value storage backing host stores. */
export interface WorkspaceStoragePort {
  getItem(name: string): string | null | Promise<string | null>;
  setItem(name: string, value: string): unknown;
  removeItem(name: string): unknown;
}

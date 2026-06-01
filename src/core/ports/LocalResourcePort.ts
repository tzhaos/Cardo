/** Port for requesting the Companion to open local files/folders via the kbe: protocol. */
export type LocalResourceRequestResult =
  | { status: 'requested' }
  | { status: 'failed'; errorMessage: string };

export interface LocalResourcePort {
  requestOpen(resourcePath: string): LocalResourceRequestResult;
}

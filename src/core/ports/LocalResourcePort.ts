/** Port for requesting a host runtime to open local files/folders. */
export type LocalResourceRequestResult =
  | { status: 'requested' }
  | { status: 'failed'; errorMessage: string };

export interface LocalResourcePort {
  requestOpen(
    resourcePath: string,
  ): LocalResourceRequestResult | Promise<LocalResourceRequestResult>;
}

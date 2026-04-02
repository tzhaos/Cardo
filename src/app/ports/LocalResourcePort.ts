export type LocalResourceRequestResult =
  | { status: 'requested' }
  | { status: 'failed'; errorMessage: string };

export interface LocalResourcePort {
  requestOpen(resourcePath: string): LocalResourceRequestResult;
}

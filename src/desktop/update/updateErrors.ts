export class UpdateFetchError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'UpdateFetchError';
    this.code = code;
  }
}

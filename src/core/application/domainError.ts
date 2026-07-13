export type DomainErrorCode =
  | 'not_found'
  | 'precondition_failed'
  | 'conflict'
  | 'invalid_command';

export class DomainCommandError extends Error {
  readonly code: DomainErrorCode;
  readonly httpStatus: number;
  constructor(code: DomainErrorCode, message: string, httpStatus?: number) {
    super(message);
    this.name = 'DomainCommandError';
    this.code = code;
    this.httpStatus = httpStatus ?? (code === 'not_found' ? 404 : code === 'conflict' ? 409 : 400);
  }
}

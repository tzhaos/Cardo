import { randomBytes, timingSafeEqual } from 'node:crypto';

const BOOTSTRAP_TTL_MS = 60_000;
const ONE_TIME_CODE_BYTES = 24;
const PROCESS_TOKEN_BYTES = 32;

export interface BootstrapCodeEntry {
  code: string;
  expiresAt: number;
}

export function generateProcessToken(): string {
  return randomBytes(PROCESS_TOKEN_BYTES).toString('base64url');
}

export function generateOneTimeCode(): string {
  return randomBytes(ONE_TIME_CODE_BYTES).toString('base64url');
}

export function parseBearerToken(headerValue: string | undefined): string | null {
  if (!headerValue) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(headerValue.trim());
  return match?.[1] ?? null;
}

/** Constant-time string compare for tokens (length mismatch → false). */
export function safeEqualToken(expected: string, actual: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(actual, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export class RuntimeAuth {
  private readonly processToken: string;
  private bootstrapCodes = new Map<string, number>();

  constructor(processToken?: string) {
    this.processToken = processToken && processToken.length >= 32 ? processToken : generateProcessToken();
  }

  getProcessToken(): string {
    return this.processToken;
  }

  validateBearer(headerValue: string | undefined): boolean {
    const token = parseBearerToken(headerValue);
    if (!token) return false;
    return safeEqualToken(this.processToken, token);
  }

  /** Issue a one-time bootstrap code (requires caller already validated process token). */
  issueBootstrapCode(): { oneTimeCode: string; expiresInMs: number } {
    this.purgeExpiredCodes();
    const oneTimeCode = generateOneTimeCode();
    this.bootstrapCodes.set(oneTimeCode, Date.now() + BOOTSTRAP_TTL_MS);
    return { oneTimeCode, expiresInMs: BOOTSTRAP_TTL_MS };
  }

  /**
   * Exchange a one-time code for the process session token (v1: same as process token).
   * Codes are single-use and TTL ≤ 60s.
   */
  exchangeOneTimeCode(code: string): string | null {
    this.purgeExpiredCodes();
    const expiresAt = this.bootstrapCodes.get(code);
    if (expiresAt == null) return null;
    this.bootstrapCodes.delete(code);
    if (Date.now() > expiresAt) return null;
    return this.processToken;
  }

  private purgeExpiredCodes(): void {
    const now = Date.now();
    for (const [code, expiresAt] of this.bootstrapCodes) {
      if (expiresAt <= now) this.bootstrapCodes.delete(code);
    }
  }
}

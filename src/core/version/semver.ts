/**
 * Strict product semver helpers (X.Y.Z only; no prerelease/build metadata).
 * Used by Desktop updater and release tooling.
 */

export const PRODUCT_SEMVER_RE = /^\d+\.\d+\.\d+$/;

export function isProductSemver(value: string): boolean {
  return PRODUCT_SEMVER_RE.test(value.trim());
}

export function normalizeProductSemver(value: string): string | null {
  const trimmed = value.trim().replace(/^v/i, '');
  return isProductSemver(trimmed) ? trimmed : null;
}

export function parseProductSemver(value: string): [number, number, number] | null {
  const normalized = normalizeProductSemver(value);
  if (!normalized) return null;
  const [major, minor, patch] = normalized.split('.').map((part) => Number(part));
  if (![major, minor, patch].every((n) => Number.isInteger(n) && n >= 0)) return null;
  return [major, minor, patch];
}

/** Negative if a < b, 0 if equal, positive if a > b. Null if either is invalid. */
export function compareProductSemver(a: string, b: string): number | null {
  const left = parseProductSemver(a);
  const right = parseProductSemver(b);
  if (!left || !right) return null;
  for (let i = 0; i < 3; i += 1) {
    const delta = left[i] - right[i];
    if (delta !== 0) return delta;
  }
  return 0;
}

export function isNewerProductSemver(candidate: string, current: string): boolean {
  const cmp = compareProductSemver(candidate, current);
  return cmp !== null && cmp > 0;
}

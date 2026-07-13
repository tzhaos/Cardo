/**
 * Release notes policy for Desktop force-update.
 *
 * Maintainers can put lines in the GitHub Release body:
 *   Cardo-Min-Client: 0.1.3
 *   Cardo-Force-Update: true
 *
 * - Min-Client: force when installed version is older than this floor.
 * - Force-Update: force whenever this release is offered as an update.
 */

import { compareProductSemver, normalizeProductSemver } from '../../core/version/semver';

export interface CardoReleasePolicy {
  minClientVersion: string | null;
  /** Explicit force flag on this release body. */
  forceUpdateFlag: boolean;
}

const MIN_CLIENT_RE = /^\s*Cardo-Min-Client:\s*v?(\d+\.\d+\.\d+)\s*$/im;
const FORCE_UPDATE_RE = /^\s*Cardo-Force-Update:\s*(true|yes|1)\s*$/im;

export function parseCardoReleasePolicy(notes: string): CardoReleasePolicy {
  const minMatch = MIN_CLIENT_RE.exec(notes);
  const minRaw = minMatch?.[1] ?? null;
  const minClientVersion = minRaw ? normalizeProductSemver(minRaw) : null;
  const forceUpdateFlag = FORCE_UPDATE_RE.test(notes);
  return { minClientVersion, forceUpdateFlag };
}

/**
 * Whether the installed client must update before continuing normal use.
 * Requires that a newer installable release is already selected.
 */
export function shouldForceClientUpdate(options: {
  currentVersion: string;
  availableVersion: string;
  policy: CardoReleasePolicy;
}): boolean {
  const current = normalizeProductSemver(options.currentVersion);
  const available = normalizeProductSemver(options.availableVersion);
  if (!current || !available) return false;

  if (options.policy.forceUpdateFlag) {
    return true;
  }

  const min = options.policy.minClientVersion;
  if (!min) return false;

  const cmpCurrentMin = compareProductSemver(current, min);
  // Force when current < minClient (must climb at least to min; available is already newer).
  return cmpCurrentMin !== null && cmpCurrentMin < 0;
}

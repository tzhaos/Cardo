import { z } from 'zod';

/**
 * Shell layout is fixed to classic (always-visible chrome).
 * Floating / zen modes are retired — no dual-read, no settings switch.
 */
export const layoutProfileIds = ['classic'] as const;
export const layoutProfileIdSchema = z.enum(layoutProfileIds);
export type LayoutProfileId = z.infer<typeof layoutProfileIdSchema>;

export const DEFAULT_LAYOUT_PROFILE_ID: LayoutProfileId = 'classic';

/** Coerce any stored value to the sole supported profile. */
export function normalizeLayoutProfileId(_value?: unknown): LayoutProfileId {
  return DEFAULT_LAYOUT_PROFILE_ID;
}

export interface LayoutProfileDefinition {
  id: LayoutProfileId;
  isOfficialDefault: boolean;
}

/** Sole supported profile — no settings switch / i18n labels (layout is fixed classic). */
export const LAYOUT_PROFILES: readonly LayoutProfileDefinition[] = [
  {
    id: 'classic',
    isOfficialDefault: true,
  },
] as const;

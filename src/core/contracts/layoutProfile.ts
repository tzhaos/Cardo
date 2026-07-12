import { z } from 'zod';

/**
 * Built-in Layout Profiles — product shell variants, not user CSS DOM rewrites.
 * classic: always-visible chrome (official default)
 * floating: auto-hide chrome; edge hover / Alt+` reveals
 * zen: chrome fully hidden; floating exit control only
 */
export const layoutProfileIds = ['classic', 'floating', 'zen'] as const;
export const layoutProfileIdSchema = z.enum(layoutProfileIds);
export type LayoutProfileId = z.infer<typeof layoutProfileIdSchema>;

export const DEFAULT_LAYOUT_PROFILE_ID: LayoutProfileId = 'classic';

/** Retired ids still present in older preference rows. */
const LEGACY_LAYOUT_PROFILE_MAP = {
  compact: 'classic',
  immersive: 'floating',
} as const satisfies Record<string, LayoutProfileId>;

export function normalizeLayoutProfileId(value: unknown): LayoutProfileId {
  if (typeof value === 'string') {
    if ((layoutProfileIds as readonly string[]).includes(value)) {
      return value as LayoutProfileId;
    }
    const mapped = LEGACY_LAYOUT_PROFILE_MAP[value as keyof typeof LEGACY_LAYOUT_PROFILE_MAP];
    if (mapped) return mapped;
  }
  return DEFAULT_LAYOUT_PROFILE_ID;
}

export interface LayoutProfileDefinition {
  id: LayoutProfileId;
  /** Official Cardo default shell freezes the current product look. */
  isOfficialDefault: boolean;
  labelKey: string;
  descriptionKey: string;
}

export const LAYOUT_PROFILES: readonly LayoutProfileDefinition[] = [
  {
    id: 'classic',
    isOfficialDefault: true,
    labelKey: 'settings.layout.classic',
    descriptionKey: 'settings.layout.classicDescription',
  },
  {
    id: 'floating',
    isOfficialDefault: false,
    labelKey: 'settings.layout.floating',
    descriptionKey: 'settings.layout.floatingDescription',
  },
  {
    id: 'zen',
    isOfficialDefault: false,
    labelKey: 'settings.layout.zen',
    descriptionKey: 'settings.layout.zenDescription',
  },
] as const;

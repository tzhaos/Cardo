import { z } from 'zod';

/** Built-in Layout Profiles — product shell variants, not user CSS DOM rewrites. */
export const layoutProfileIds = ['classic', 'compact', 'immersive'] as const;
export const layoutProfileIdSchema = z.enum(layoutProfileIds);
export type LayoutProfileId = z.infer<typeof layoutProfileIdSchema>;

export const DEFAULT_LAYOUT_PROFILE_ID: LayoutProfileId = 'classic';

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
    id: 'compact',
    isOfficialDefault: false,
    labelKey: 'settings.layout.compact',
    descriptionKey: 'settings.layout.compactDescription',
  },
  {
    id: 'immersive',
    isOfficialDefault: false,
    labelKey: 'settings.layout.immersive',
    descriptionKey: 'settings.layout.immersiveDescription',
  },
] as const;

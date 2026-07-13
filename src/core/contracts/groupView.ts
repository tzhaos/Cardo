import { z } from 'zod';

/**
 * Group (product term; persistence still uses page ids) content layout mode.
 * Canvas is one view among several; new modes extend this enum only via code PR.
 *
 * - freeform: absolute frames, free drag/resize, free overlap (today's canvas)
 * - waterfall: free drag but no free overlap; layout engine snaps to columns
 * - list: serial vertical stack of boxes (menu-like rows)
 */
export const groupViewModeIds = ['freeform', 'waterfall', 'list'] as const;

export const groupViewModeSchema = z.enum(groupViewModeIds);
export type GroupViewMode = z.infer<typeof groupViewModeSchema>;

export const DEFAULT_GROUP_VIEW_MODE: GroupViewMode = 'freeform';

export const GROUP_VIEW_MODE_META = {
  freeform: {
    labelKey: 'groupView.freeform',
    descriptionKey: 'groupView.freeformDescription',
  },
  waterfall: {
    labelKey: 'groupView.waterfall',
    descriptionKey: 'groupView.waterfallDescription',
  },
  list: {
    labelKey: 'groupView.list',
    descriptionKey: 'groupView.listDescription',
  },
} as const satisfies Record<GroupViewMode, { labelKey: string; descriptionKey: string }>;

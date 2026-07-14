import { z } from 'zod';

/**
 * Group (product term; persistence still uses page ids) content layout mode.
 * Canvas is one view among several; new modes extend this enum only via code PR.
 *
 * - freeform: absolute frames, grid-snapped, no overlap — box morphology
 * - waterfall: scroll document; masonry cards — card morphology
 * - list: scroll document; grouped items in a grid — item morphology
 *
 * Layouts are isolated: freeform frame columns vs mode_layouts.waterfall/list.
 */
export const groupViewModeIds = ['freeform', 'waterfall', 'list'] as const;

export const groupViewModeSchema = z.enum(groupViewModeIds);
export type GroupViewMode = z.infer<typeof groupViewModeSchema>;

export const DEFAULT_GROUP_VIEW_MODE: GroupViewMode = 'freeform';

/** Waterfall packing columns: 0 = auto from viewport width. */
export const WATERFALL_COLUMN_MAX = 4;
/** List section columns. */
export const LIST_COLUMN_MAX = 3;
export const LIST_COLUMN_MIN = 1;
export const WATERFALL_COLUMN_MIN = 0;

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

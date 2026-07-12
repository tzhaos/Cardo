import { z } from 'zod';

/**
 * Closed Feature Catalog (Phase C).
 * Extending the set requires a code PR — no dynamic feature id loading.
 *
 * Official Cardo defaults are all ON so classic shell looks unchanged.
 */
export const featureIds = [
  'chrome.topBar',
  'chrome.historyToolbar',
  'chrome.bottomToolbar',
  'chrome.canvasTools',
  'chrome.globalSearch',
  'chrome.runtimeBanner',
  'workspace.collection',
  'workspace.recycleBin',
  'workspace.multiPage',
  'box.appearancePopover',
] as const;

export const featureIdSchema = z.enum(featureIds);
export type FeatureId = z.infer<typeof featureIdSchema>;

/** User overrides only. Missing key ⇒ catalog default (true for all v1 features). */
export const featureFlagOverridesSchema = z.partialRecord(featureIdSchema, z.boolean());
export type FeatureFlagOverrides = z.infer<typeof featureFlagOverridesSchema>;

/** Strip retired keys (e.g. item.contextMenu) without failing hydrate. */
export function normalizeFeatureFlagOverrides(value: unknown): FeatureFlagOverrides {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const next: FeatureFlagOverrides = {};
  const source = value as Record<string, unknown>;
  for (const id of featureIds) {
    if (typeof source[id] === 'boolean') {
      next[id] = source[id];
    }
  }
  return pruneDefaultOverrides(next);
}

export type FeatureSlot =
  | 'shell.top'
  | 'shell.corner'
  | 'shell.bottom'
  | 'canvas.overlay'
  | 'shell.modal'
  | 'shell.toast'
  | 'topBar.tab'
  | 'topBar'
  | 'box.chrome';

export interface FeatureDefinition {
  id: FeatureId;
  slot: FeatureSlot;
  /** Official Cardo default — always true in v1 catalog. */
  defaultEnabled: true;
  /** Features that must also be effectively on. */
  dependsOn: readonly FeatureId[];
  /** i18n message keys for Settings. */
  labelKey: string;
  descriptionKey: string;
}

export const FEATURE_CATALOG: readonly FeatureDefinition[] = [
  {
    id: 'chrome.topBar',
    slot: 'shell.top',
    defaultEnabled: true,
    dependsOn: [],
    labelKey: 'settings.feature.chrome.topBar',
    descriptionKey: 'settings.feature.chrome.topBarDescription',
  },
  {
    id: 'chrome.historyToolbar',
    slot: 'shell.corner',
    defaultEnabled: true,
    dependsOn: [],
    labelKey: 'settings.feature.chrome.historyToolbar',
    descriptionKey: 'settings.feature.chrome.historyToolbarDescription',
  },
  {
    id: 'chrome.bottomToolbar',
    slot: 'shell.bottom',
    defaultEnabled: true,
    dependsOn: [],
    labelKey: 'settings.feature.chrome.bottomToolbar',
    descriptionKey: 'settings.feature.chrome.bottomToolbarDescription',
  },
  {
    id: 'chrome.canvasTools',
    slot: 'canvas.overlay',
    defaultEnabled: true,
    dependsOn: [],
    labelKey: 'settings.feature.chrome.canvasTools',
    descriptionKey: 'settings.feature.chrome.canvasToolsDescription',
  },
  {
    id: 'chrome.globalSearch',
    slot: 'shell.modal',
    defaultEnabled: true,
    dependsOn: ['chrome.bottomToolbar'],
    labelKey: 'settings.feature.chrome.globalSearch',
    descriptionKey: 'settings.feature.chrome.globalSearchDescription',
  },
  {
    id: 'chrome.runtimeBanner',
    slot: 'shell.toast',
    defaultEnabled: true,
    dependsOn: [],
    labelKey: 'settings.feature.chrome.runtimeBanner',
    descriptionKey: 'settings.feature.chrome.runtimeBannerDescription',
  },
  {
    id: 'workspace.collection',
    slot: 'topBar.tab',
    defaultEnabled: true,
    dependsOn: ['chrome.topBar'],
    labelKey: 'settings.feature.workspace.collection',
    descriptionKey: 'settings.feature.workspace.collectionDescription',
  },
  {
    id: 'workspace.recycleBin',
    slot: 'topBar.tab',
    defaultEnabled: true,
    dependsOn: ['chrome.topBar'],
    labelKey: 'settings.feature.workspace.recycleBin',
    descriptionKey: 'settings.feature.workspace.recycleBinDescription',
  },
  {
    id: 'workspace.multiPage',
    slot: 'topBar',
    defaultEnabled: true,
    dependsOn: ['chrome.topBar'],
    labelKey: 'settings.feature.workspace.multiPage',
    descriptionKey: 'settings.feature.workspace.multiPageDescription',
  },
  {
    id: 'box.appearancePopover',
    slot: 'box.chrome',
    defaultEnabled: true,
    dependsOn: [],
    labelKey: 'settings.feature.box.appearancePopover',
    descriptionKey: 'settings.feature.box.appearancePopoverDescription',
  },
] as const;

const catalogById = new Map(FEATURE_CATALOG.map((entry) => [entry.id, entry] as const));

export function getFeatureDefinition(id: FeatureId): FeatureDefinition {
  const def = catalogById.get(id);
  if (!def) throw new Error(`Unknown feature id: ${id}`);
  return def;
}

/**
 * Effective enablement: override ?? catalog default, then all dependsOn must pass.
 * Empty overrides ⇒ official Cardo defaults (all on).
 */
export function isFeatureEnabled(
  id: FeatureId,
  overrides: FeatureFlagOverrides | undefined,
  visiting: Set<FeatureId> = new Set(),
): boolean {
  if (visiting.has(id)) return true;
  visiting.add(id);
  const def = getFeatureDefinition(id);
  const selfOn = overrides?.[id] ?? def.defaultEnabled;
  if (!selfOn) return false;
  return def.dependsOn.every((dep) => isFeatureEnabled(dep, overrides, visiting));
}

/** When enabling a feature, also turn on its dependency chain. */
export function withFeatureEnabled(
  overrides: FeatureFlagOverrides,
  id: FeatureId,
  enabled: boolean,
): FeatureFlagOverrides {
  const next: FeatureFlagOverrides = { ...overrides };
  if (!enabled) {
    next[id] = false;
    // Turning off a parent: leave child overrides; they resolve false via dependsOn.
    return pruneDefaultOverrides(next);
  }

  const enableChain = (featureId: FeatureId) => {
    const def = getFeatureDefinition(featureId);
    for (const dep of def.dependsOn) enableChain(dep);
    next[featureId] = true;
  };
  enableChain(id);
  return pruneDefaultOverrides(next);
}

/** Drop overrides that equal catalog defaults to keep preferences sparse. */
function pruneDefaultOverrides(overrides: FeatureFlagOverrides): FeatureFlagOverrides {
  const next: FeatureFlagOverrides = {};
  for (const id of featureIds) {
    const value = overrides[id];
    if (value === undefined) continue;
    const def = getFeatureDefinition(id);
    if (value !== def.defaultEnabled) {
      next[id] = value;
    }
  }
  return next;
}

export function resetFeatureFlagOverrides(): FeatureFlagOverrides {
  return {};
}

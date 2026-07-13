import type { ReactNode } from 'react';
import type { FeatureId } from '../../core/contracts/featureCatalog';
import { isFeatureEnabled } from '../../core/contracts/featureCatalog';
import { usePreferencesStore } from '../app/stores/preferencesStore';

/**
 * Mount chrome / product slots only when the closed Feature Catalog says so.
 * Closing a feature unmounts UI only — Canvas hit-testing and drag stay intact.
 */
export function FeatureGate({
  feature,
  children,
  fallback = null,
}: {
  feature: FeatureId;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const enabled = useFeatureEnabled(feature);
  return enabled ? children : fallback;
}

export function useFeatureEnabled(feature: FeatureId): boolean {
  const featureFlags = usePreferencesStore((state) => state.featureFlags);
  return isFeatureEnabled(feature, featureFlags);
}

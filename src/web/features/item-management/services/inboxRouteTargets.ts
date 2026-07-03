export interface InboxRouteTarget {
  id: string;
  label: string;
  boxId: string;
  boxLabel: string;
  columnId?: string;
  columnLabel?: string;
  searchText: string;
}

export interface InboxRouteTargetSections {
  recentTargets: InboxRouteTarget[];
  otherTargets: InboxRouteTarget[];
}

export const MAX_RECENT_INBOX_ROUTE_TARGETS = 4;

function getNormalizedQuery(query: string) {
  return query.trim().toLowerCase();
}

function getTargetSearchText(target: InboxRouteTarget) {
  return [target.label, target.boxLabel, target.columnLabel ?? '', target.searchText]
    .join(' ')
    .toLowerCase();
}

export function pushRecentInboxRouteTargetId(recentTargetIds: string[], targetId: string) {
  return [targetId, ...recentTargetIds.filter((recentTargetId) => recentTargetId !== targetId)]
    .filter(Boolean)
    .slice(0, MAX_RECENT_INBOX_ROUTE_TARGETS);
}

export function filterInboxRouteTargets(targets: InboxRouteTarget[], query: string) {
  const normalizedQuery = getNormalizedQuery(query);

  if (!normalizedQuery) {
    return targets;
  }

  return targets.filter((target) => getTargetSearchText(target).includes(normalizedQuery));
}

export function sectionInboxRouteTargets(
  targets: InboxRouteTarget[],
  recentTargetIds: string[],
  query: string,
): InboxRouteTargetSections {
  const filteredTargets = filterInboxRouteTargets(targets, query);
  const filteredTargetsById = new Map(filteredTargets.map((target) => [target.id, target]));
  const recentTargets = recentTargetIds
    .map((targetId) => filteredTargetsById.get(targetId))
    .filter((target): target is InboxRouteTarget => Boolean(target));
  const recentTargetIdSet = new Set(recentTargets.map((target) => target.id));

  return {
    recentTargets,
    otherTargets: filteredTargets.filter((target) => !recentTargetIdSet.has(target.id)),
  };
}

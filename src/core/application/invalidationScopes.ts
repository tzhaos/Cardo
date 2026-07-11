import type { HistoryChangeSet, HistoryRowChange } from '../contracts/history';
import type { InvalidationScope } from '../contracts/runtimeProtocol';

/**
 * Derive client invalidation scopes from a history change set (design §6.9.1 / §6.17).
 * Prefer over-wide `projection` over missing a refresh. Pure: no DB I/O.
 */
export function deriveInvalidationScopes(changes: HistoryChangeSet): InvalidationScope[] {
  if (!changes.length) return [];

  const tables = new Set(changes.map((change) => change.table));

  if (tables.has('collection_box_views')) {
    return [{ type: 'projection' }, { type: 'history' }];
  }

  if (tables.size === 1 && tables.has('preferences')) {
    return [{ type: 'preferences' }, { type: 'history' }];
  }

  if (onlyAppStateNavigation(changes)) {
    return [{ type: 'workspaceState' }, { type: 'history' }];
  }

  if (onlyPagesMeta(changes)) {
    return [{ type: 'pageTabs' }, { type: 'history' }];
  }

  const singleBoxId = onlySingleBoxItems(changes);
  if (singleBoxId) {
    return [{ type: 'boxItems', boxId: singleBoxId }, { type: 'history' }];
  }

  const singlePageId = onlySinglePageBoxes(changes);
  if (singlePageId) {
    return [{ type: 'pageBoxes', pageId: singlePageId }, { type: 'history' }];
  }

  const scopes: InvalidationScope[] = [{ type: 'projection' }];
  if (tables.has('preferences')) {
    scopes.push({ type: 'preferences' });
  }
  scopes.push({ type: 'history' });
  return scopes;
}

function onlyAppStateNavigation(changes: HistoryChangeSet): boolean {
  if (!changes.length || changes.some((change) => change.table !== 'app_state')) {
    return false;
  }
  return changes.every((change) => {
    if (change.table !== 'app_state') return false;
    const { before, after } = change;
    if (!before || !after) return false;
    if (before.schemaVersion !== after.schemaVersion) return false;
    const activeChanged = before.activePageId !== after.activePageId;
    const defaultChanged = before.defaultPageId !== after.defaultPageId;
    return activeChanged || defaultChanged;
  });
}

/** Rename / reorder only — no page insert or delete (those cascade / need broader refresh). */
function onlyPagesMeta(changes: HistoryChangeSet): boolean {
  if (!changes.length || changes.some((change) => change.table !== 'pages')) {
    return false;
  }
  return changes.every((change) => change.table === 'pages' && change.before && change.after);
}

function onlySingleBoxItems(changes: HistoryChangeSet): string | null {
  if (!changes.length || changes.some((change) => change.table !== 'box_items')) {
    return null;
  }
  const boxIds = new Set<string>();
  for (const change of changes) {
    if (change.table !== 'box_items') return null;
    boxIds.add(change.key.boxId);
  }
  if (boxIds.size !== 1) return null;
  return [...boxIds][0] ?? null;
}

function onlySinglePageBoxes(changes: HistoryChangeSet): string | null {
  if (!changes.length || changes.some((change) => change.table !== 'boxes')) {
    return null;
  }
  const pageIds = new Set<string>();
  for (const change of changes) {
    if (change.table !== 'boxes') return null;
    const pageId = pageIdFromBoxChange(change);
    if (!pageId) return null;
    pageIds.add(pageId);
  }
  if (pageIds.size !== 1) return null;
  return [...pageIds][0] ?? null;
}

function pageIdFromBoxChange(change: HistoryRowChange): string | null {
  if (change.table !== 'boxes') return null;
  const row = change.after ?? change.before;
  return row?.pageId ?? null;
}

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

  // Rename/reorder-only pages meta → pageTabs. Combined page+state refreshes
  // (e.g. page.create that also touches app_state) are multi-table and fall
  // through to projection; this helper never emits pageTabsAndState.
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

/**
 * True single-page boxes-only path.
 * - Cross-page move (before.pageId !== after.pageId → multiple ids): widen to projection.
 * - Insert (after only) or hard-delete (before only) with one present pageId: still narrow
 *   to pageBoxes for that page (not under-invalidation).
 * - Multi-table hard-deletes never reach this helper (table filter fails first).
 */
function onlySinglePageBoxes(changes: HistoryChangeSet): string | null {
  if (!changes.length || changes.some((change) => change.table !== 'boxes')) {
    return null;
  }
  const pageIds = new Set<string>();
  for (const change of changes) {
    if (change.table !== 'boxes') return null;
    const ids = pageIdsFromBoxChange(change);
    // Empty pageId set, or a single change spanning two pages, widens out.
    if (ids.length === 0) return null;
    if (ids.length > 1) return null;
    for (const id of ids) pageIds.add(id);
  }
  if (pageIds.size !== 1) return null;
  return [...pageIds][0] ?? null;
}

function pageIdsFromBoxChange(change: HistoryRowChange): string[] {
  if (change.table !== 'boxes') return [];
  const ids = new Set<string>();
  if (change.before?.pageId) ids.add(change.before.pageId);
  if (change.after?.pageId) ids.add(change.after.pageId);
  return [...ids];
}

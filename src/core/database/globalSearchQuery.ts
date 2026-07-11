import { and, eq, inArray, notInArray, or, sql } from 'drizzle-orm';
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import { globalSearchResultSchema, type GlobalSearchResult } from '../contracts/globalSearch';
import { COLLECTION_PAGE_ID, RECYCLE_BIN_PAGE_ID } from './initializeWorkspaceDatabase';
import type { KhaosDatabase } from './createDatabaseClient';
import { boxes, boxItems, items, pages } from './schema';
import { projectWorkspaceItem } from './workspaceQueries';

export async function searchWorkspaceDatabase(database: KhaosDatabase, query: string, limit = 60) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const pageCondition = createTextCondition(pages.title, tokens);
  const boxCondition = createTextCondition(boxes.title, tokens);
  const itemCondition = or(
    createTextCondition(items.title, tokens),
    createTextCondition(items.content, tokens),
  );
  const normalPageIds = await database
    .select({ id: pages.id })
    .from(pages)
    .where(notInArray(pages.id, [COLLECTION_PAGE_ID, RECYCLE_BIN_PAGE_ID]))
    .all();
  const allowedPageIds = normalPageIds.map((page) => page.id);
  if (!allowedPageIds.length) return [];

  const [pageRows, boxRows, itemRows, placementRows] = await Promise.all([
    database
      .select()
      .from(pages)
      .where(and(inArray(pages.id, allowedPageIds), pageCondition))
      .all(),
    database
      .select({ box: boxes, page: pages })
      .from(boxes)
      .innerJoin(pages, eq(boxes.pageId, pages.id))
      .where(and(inArray(boxes.pageId, allowedPageIds), boxCondition))
      .all(),
    database
      .select({ item: items, placement: boxItems, box: boxes, page: pages })
      .from(items)
      .innerJoin(boxItems, eq(items.id, boxItems.itemId))
      .innerJoin(boxes, eq(boxItems.boxId, boxes.id))
      .innerJoin(pages, eq(boxes.pageId, pages.id))
      .where(and(inArray(boxes.pageId, allowedPageIds), itemCondition))
      .all(),
    database.select().from(boxItems).all(),
  ]);
  const itemCountByBox = new Map<string, number>();
  for (const placement of placementRows) {
    itemCountByBox.set(placement.boxId, (itemCountByBox.get(placement.boxId) ?? 0) + 1);
  }
  const results: GlobalSearchResult[] = [];

  for (const page of pageRows) {
    const score = getMatchScore(page.title, normalizedQuery);
    if (score <= 0) continue;
    const pageSummary = { id: page.id, title: page.title, updatedAt: page.updatedAt };
    results.push({
      kind: 'page',
      id: `page:${page.id}`,
      page: pageSummary,
      title: page.title,
      path: page.title,
      detail: '',
      score: score + 5,
      updatedAt: page.updatedAt,
    });
  }

  for (const { box, page } of boxRows) {
    const score = getMatchScore(box.title, normalizedQuery);
    if (score <= 0) continue;
    const itemCount = itemCountByBox.get(box.id) ?? 0;
    results.push({
      kind: 'box',
      id: `box:${box.id}`,
      page: { id: page.id, title: page.title, updatedAt: page.updatedAt },
      box: {
        id: box.id,
        pageId: box.pageId,
        title: box.title,
        frame: { x: box.x, y: box.y, width: box.width, height: box.height },
        itemCount,
        updatedAt: box.updatedAt,
      },
      title: box.title,
      path: page.title,
      detail: String(itemCount),
      score: score + 3,
      updatedAt: box.updatedAt,
    });
  }

  for (const { item, placement, box, page } of itemRows) {
    const projectedItem = projectWorkspaceItem(item, placement.isPinned);
    const title = getItemResultTitle(projectedItem);
    const detail = getItemDetail(projectedItem);
    const titleScore = getMatchScore(title, normalizedQuery);
    const detailScore = getMatchScore(detail, normalizedQuery);
    const score = Math.max(titleScore > 0 ? titleScore + 2 : 0, detailScore);
    if (score <= 0) continue;
    results.push({
      kind: 'item',
      id: `item:${item.id}`,
      page: { id: page.id, title: page.title, updatedAt: page.updatedAt },
      box: {
        id: box.id,
        pageId: box.pageId,
        title: box.title,
        frame: { x: box.x, y: box.y, width: box.width, height: box.height },
        itemCount: itemCountByBox.get(box.id) ?? 0,
        updatedAt: box.updatedAt,
      },
      item: projectedItem,
      title,
      path: `${page.title} / ${box.title}`,
      detail,
      score,
      updatedAt: item.updatedAt,
    });
  }

  return globalSearchResultSchema
    .array()
    .parse(
      results
        .sort(
          (first, second) =>
            second.score - first.score ||
            Date.parse(second.updatedAt) - Date.parse(first.updatedAt) ||
            first.title.localeCompare(second.title),
        )
        .slice(0, limit),
    );
}

function createTextCondition(column: AnySQLiteColumn, tokens: string[]) {
  return or(...tokens.map((token) => sql`instr(lower(${column}), ${token}) > 0`));
}

function getItemResultTitle(item: ReturnType<typeof projectWorkspaceItem>) {
  if (item.title.trim()) return item.title.trim();
  if (item.type === 'clipboard') return createExcerpt(item.text, 48);
  return item.type === 'bookmark' ? item.url : item.path;
}

function getItemDetail(item: ReturnType<typeof projectWorkspaceItem>) {
  if (item.type === 'clipboard') return createExcerpt(item.text, 120);
  if (item.type === 'bookmark') return item.url;
  return item.path;
}

function getMatchScore(value: string, query: string) {
  const normalizedValue = normalize(value);
  if (!normalizedValue) return 0;
  if (normalizedValue === query) return 100;
  if (normalizedValue.startsWith(query)) return 82;
  if (normalizedValue.includes(query)) return 64;
  const queryTokens = query.split(/\s+/).filter(Boolean);
  return queryTokens.length > 1 && queryTokens.every((token) => normalizedValue.includes(token))
    ? 46
    : 0;
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

function createExcerpt(value: string, maximumLength: number) {
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length > maximumLength ? `${compact.slice(0, maximumLength).trimEnd()}…` : compact;
}

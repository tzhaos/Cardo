import {
  isRecycleBinPageId,
  type BoxItem,
  type WorkspaceBox,
  type WorkspacePage,
  type WorkspaceSnapshot,
} from './workspace';

export type GlobalSearchResult =
  | {
      kind: 'page';
      id: string;
      page: WorkspacePage;
      title: string;
      path: string;
      detail: string;
      score: number;
      updatedAt: string;
    }
  | {
      kind: 'box';
      id: string;
      page: WorkspacePage;
      box: WorkspaceBox;
      title: string;
      path: string;
      detail: string;
      score: number;
      updatedAt: string;
    }
  | {
      kind: 'item';
      id: string;
      page: WorkspacePage;
      box: WorkspaceBox;
      item: BoxItem;
      title: string;
      path: string;
      detail: string;
      score: number;
      updatedAt: string;
    };

export function searchWorkspace(snapshot: WorkspaceSnapshot, query: string, limit = 60) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];
  const pages = snapshot.pages.filter((page) => !isRecycleBinPageId(page.id));
  const pagesById = new Map(pages.map((page) => [page.id, page]));
  const results: GlobalSearchResult[] = [];

  pages.forEach((page) => {
    const score = getMatchScore(page.title, normalizedQuery);
    if (score > 0) {
      results.push({
        kind: 'page',
        id: `page:${page.id}`,
        page,
        title: page.title,
        path: page.title,
        detail: '',
        score: score + 5,
        updatedAt: page.updatedAt,
      });
    }
  });

  snapshot.boxes.forEach((box) => {
    const page = pagesById.get(box.pageId);
    if (!page) return;
    const boxScore = getMatchScore(box.title, normalizedQuery);
    if (boxScore > 0) {
      results.push({
        kind: 'box',
        id: `box:${box.id}`,
        page,
        box,
        title: box.title,
        path: page.title,
        detail: `${box.items.length}`,
        score: boxScore + 3,
        updatedAt: box.updatedAt,
      });
    }

    box.items.forEach((item) => {
      const title = getItemResultTitle(item);
      const detail = getItemDetail(item);
      const titleScore = getMatchScore(title, normalizedQuery);
      const detailScore = getMatchScore(detail, normalizedQuery);
      const score = Math.max(titleScore > 0 ? titleScore + 2 : 0, detailScore);
      if (score <= 0) return;
      results.push({
        kind: 'item',
        id: `item:${item.id}`,
        page,
        box,
        item,
        title,
        path: `${page.title} / ${box.title}`,
        detail,
        score,
        updatedAt: item.updatedAt,
      });
    });
  });

  return results
    .sort(
      (first, second) =>
        second.score - first.score ||
        Date.parse(second.updatedAt) - Date.parse(first.updatedAt) ||
        first.title.localeCompare(second.title),
    )
    .slice(0, limit);
}

export function getItemResultTitle(item: BoxItem) {
  if (item.title.trim()) return item.title.trim();
  if (item.type === 'clipboard') return createExcerpt(item.text, 48);
  return item.type === 'bookmark' ? item.url : item.path;
}

export function getItemDetail(item: BoxItem) {
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

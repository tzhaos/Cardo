import type { Bookmark } from '../model/bookmark';

function getTimeScore(value: string | null, nowMs: number) {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return 0;
  }

  const ageDays = Math.max(0, (nowMs - timestamp) / 86_400_000);
  return Math.max(0, 30 - ageDays);
}

export function getFrequentBookmarks(bookmarks: Iterable<Bookmark>, limit = 8, now = new Date()) {
  const nowMs = now.getTime();

  return [...bookmarks]
    .filter((bookmark) => bookmark.isPinned || bookmark.openCount > 0 || bookmark.lastOpenedAt)
    .sort((left, right) => {
      if (left.isPinned !== right.isPinned) {
        return left.isPinned ? -1 : 1;
      }

      const leftScore = left.openCount * 4 + getTimeScore(left.lastOpenedAt, nowMs);
      const rightScore = right.openCount * 4 + getTimeScore(right.lastOpenedAt, nowMs);

      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }

      return left.title.localeCompare(right.title);
    })
    .slice(0, limit);
}

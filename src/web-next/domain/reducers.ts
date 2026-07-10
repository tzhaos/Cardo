import type { BoxFrame, BoxItem, WorkspaceBoxType, WorkspaceSnapshot } from './workspace';
import { createPage, createWorkspaceBox, nowIso } from './factories';

export function renamePage(snapshot: WorkspaceSnapshot, pageId: string, title: string) {
  const nextTitle = title.trim();
  if (!nextTitle) {
    return snapshot;
  }

  return {
    ...snapshot,
    pages: snapshot.pages.map((page) =>
      page.id === pageId ? { ...page, title: nextTitle, updatedAt: nowIso() } : page,
    ),
  };
}

export function addPage(snapshot: WorkspaceSnapshot, title = 'Untitled') {
  const page = createPage(title, snapshot.pages.length);
  return {
    ...snapshot,
    pages: [...snapshot.pages, page],
    activePageId: page.id,
  };
}

export function deletePage(snapshot: WorkspaceSnapshot, pageId: string) {
  if (snapshot.pages.length <= 1) {
    return snapshot;
  }

  const pages = snapshot.pages
    .filter((page) => page.id !== pageId)
    .map((page, order) => ({ ...page, order }));
  const activePageId =
    snapshot.activePageId === pageId ? (pages[0]?.id ?? '') : snapshot.activePageId;

  return {
    pages,
    activePageId,
    boxes: snapshot.boxes.filter((box) => box.pageId !== pageId),
  };
}

export function reorderPages(snapshot: WorkspaceSnapshot, orderedPageIds: string[]) {
  if (
    orderedPageIds.length !== snapshot.pages.length ||
    orderedPageIds.some((pageId) => !snapshot.pages.some((page) => page.id === pageId))
  ) {
    return snapshot;
  }

  const currentOrder = [...snapshot.pages]
    .sort((first, second) => first.order - second.order)
    .map((page) => page.id);
  if (currentOrder.every((pageId, index) => pageId === orderedPageIds[index])) {
    return snapshot;
  }

  const pagesById = new Map(snapshot.pages.map((page) => [page.id, page]));

  return {
    ...snapshot,
    pages: orderedPageIds.map((pageId, order) => ({
      ...pagesById.get(pageId)!,
      order,
      updatedAt: nowIso(),
    })),
  };
}

export function setActivePage(snapshot: WorkspaceSnapshot, pageId: string) {
  return snapshot.pages.some((page) => page.id === pageId)
    ? { ...snapshot, activePageId: pageId }
    : snapshot;
}

export function addBox(
  snapshot: WorkspaceSnapshot,
  pageId: string,
  type: WorkspaceBoxType,
  frame: BoxFrame,
  title?: string,
) {
  return {
    ...snapshot,
    boxes: [...snapshot.boxes, createWorkspaceBox(pageId, type, frame, title)],
  };
}

export function updateBoxFrame(snapshot: WorkspaceSnapshot, boxId: string, frame: BoxFrame) {
  return {
    ...snapshot,
    boxes: snapshot.boxes.map((box) =>
      box.id === boxId ? { ...box, frame, updatedAt: nowIso() } : box,
    ),
  };
}

export function renameBox(snapshot: WorkspaceSnapshot, boxId: string, title: string) {
  const nextTitle = title.trim();
  if (!nextTitle) {
    return snapshot;
  }

  return {
    ...snapshot,
    boxes: snapshot.boxes.map((box) =>
      box.id === boxId ? { ...box, title: nextTitle, updatedAt: nowIso() } : box,
    ),
  };
}

export function deleteBox(snapshot: WorkspaceSnapshot, boxId: string) {
  return {
    ...snapshot,
    boxes: snapshot.boxes.filter((box) => box.id !== boxId),
  };
}

export function addItem(snapshot: WorkspaceSnapshot, boxId: string, item: BoxItem) {
  return {
    ...snapshot,
    boxes: snapshot.boxes.map((box) =>
      box.id === boxId ? { ...box, items: [item, ...box.items], updatedAt: nowIso() } : box,
    ),
  };
}

export function renameItem(
  snapshot: WorkspaceSnapshot,
  boxId: string,
  itemId: string,
  title: string,
) {
  const nextTitle = title.trim();
  if (!nextTitle) {
    return snapshot;
  }

  return {
    ...snapshot,
    boxes: snapshot.boxes.map((box) =>
      box.id === boxId
        ? {
            ...box,
            items: box.items.map((item) =>
              item.id === itemId ? { ...item, title: nextTitle, updatedAt: nowIso() } : item,
            ),
            updatedAt: nowIso(),
          }
        : box,
    ),
  };
}

export function deleteItem(snapshot: WorkspaceSnapshot, boxId: string, itemId: string) {
  return {
    ...snapshot,
    boxes: snapshot.boxes.map((box) =>
      box.id === boxId
        ? {
            ...box,
            items: box.items.filter((item) => item.id !== itemId),
            updatedAt: nowIso(),
          }
        : box,
    ),
  };
}

export function moveBoxToPage(
  snapshot: WorkspaceSnapshot,
  boxId: string,
  pageId: string,
  frame?: BoxFrame,
) {
  if (!snapshot.pages.some((page) => page.id === pageId)) {
    return snapshot;
  }

  return {
    ...snapshot,
    activePageId: pageId,
    boxes: snapshot.boxes.map((box) =>
      box.id === boxId ? { ...box, pageId, frame: frame ?? box.frame, updatedAt: nowIso() } : box,
    ),
  };
}

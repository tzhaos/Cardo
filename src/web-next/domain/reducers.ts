import {
  isRecycleBinPageId,
  type BoxFrame,
  type BoxItem,
  type WorkspaceBoxDetailMode,
  type WorkspaceBoxType,
  type WorkspaceBoxViewMode,
  type WorkspaceSnapshot,
} from './workspace';
import { createPage, createWorkspaceBox, nowIso } from './factories';
import {
  constrainBoxFrameToCanvas,
  createCanvasWorldBounds,
  type CanvasViewportSize,
} from './canvasGeometry';

export function renamePage(snapshot: WorkspaceSnapshot, pageId: string, title: string) {
  if (isRecycleBinPageId(pageId)) {
    return snapshot;
  }

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
  const page = createPage(
    title,
    snapshot.pages.filter((candidate) => !isRecycleBinPageId(candidate.id)).length,
  );
  return {
    ...snapshot,
    pages: insertWorkspacePage(snapshot, page),
    activePageId: page.id,
  };
}

export function deletePage(snapshot: WorkspaceSnapshot, pageId: string) {
  const workspacePages = snapshot.pages.filter((page) => !isRecycleBinPageId(page.id));
  const recycleBinPage = snapshot.pages.find((page) => isRecycleBinPageId(page.id));
  if (
    isRecycleBinPageId(pageId) ||
    workspacePages.length <= 1 ||
    !workspacePages.some((page) => page.id === pageId)
  ) {
    return snapshot;
  }

  const pages = workspacePages
    .filter((page) => page.id !== pageId)
    .map((page, order) => ({ ...page, order }));
  if (recycleBinPage) {
    pages.push({ ...recycleBinPage, order: pages.length });
  }
  const defaultPageId =
    snapshot.defaultPageId === pageId ? (pages[0]?.id ?? '') : snapshot.defaultPageId;
  const activePageId = snapshot.activePageId === pageId ? defaultPageId : snapshot.activePageId;

  return {
    pages,
    activePageId,
    defaultPageId,
    boxes: recycleBinPage
      ? snapshot.boxes.map((box) =>
          box.pageId === pageId ? { ...box, pageId: recycleBinPage.id, updatedAt: nowIso() } : box,
        )
      : snapshot.boxes.filter((box) => box.pageId !== pageId),
  };
}

export function reorderPages(snapshot: WorkspaceSnapshot, orderedPageIds: string[]) {
  const workspacePages = snapshot.pages.filter((page) => !isRecycleBinPageId(page.id));
  const recycleBinPage = snapshot.pages.find((page) => isRecycleBinPageId(page.id));
  if (
    orderedPageIds.length !== workspacePages.length ||
    orderedPageIds.some((pageId) => !workspacePages.some((page) => page.id === pageId))
  ) {
    return snapshot;
  }

  const currentOrder = [...workspacePages]
    .sort((first, second) => first.order - second.order)
    .map((page) => page.id);
  if (currentOrder.every((pageId, index) => pageId === orderedPageIds[index])) {
    return snapshot;
  }

  const pagesById = new Map(workspacePages.map((page) => [page.id, page]));

  return {
    ...snapshot,
    pages: [
      ...orderedPageIds.map((pageId, order) => ({
        ...pagesById.get(pageId)!,
        order,
        updatedAt: nowIso(),
      })),
      ...(recycleBinPage ? [{ ...recycleBinPage, order: workspacePages.length }] : []),
    ],
  };
}

export function setActivePage(snapshot: WorkspaceSnapshot, pageId: string) {
  return snapshot.pages.some((page) => page.id === pageId)
    ? { ...snapshot, activePageId: pageId }
    : snapshot;
}

export function setDefaultPage(snapshot: WorkspaceSnapshot, pageId: string) {
  return snapshot.pages.some((page) => page.id === pageId && !isRecycleBinPageId(page.id))
    ? { ...snapshot, defaultPageId: pageId }
    : snapshot;
}

export function addBox(
  snapshot: WorkspaceSnapshot,
  pageId: string,
  type: WorkspaceBoxType,
  frame: BoxFrame,
  title?: string,
) {
  if (isRecycleBinPageId(pageId)) {
    return snapshot;
  }

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

export function constrainWorkspaceFramesToViewport(
  snapshot: WorkspaceSnapshot,
  viewport: CanvasViewportSize,
) {
  const bounds = createCanvasWorldBounds(viewport);
  let changed = false;
  const boxes = snapshot.boxes.map((box) => {
    const frame = constrainBoxFrameToCanvas(box.frame, bounds);
    if (framesEqual(frame, box.frame)) {
      return box;
    }
    changed = true;
    return { ...box, frame, updatedAt: nowIso() };
  });

  return changed ? { ...snapshot, boxes } : snapshot;
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

export function setBoxViewMode(
  snapshot: WorkspaceSnapshot,
  boxId: string,
  viewMode: WorkspaceBoxViewMode,
) {
  return {
    ...snapshot,
    boxes: snapshot.boxes.map((box) =>
      box.id === boxId && box.viewMode !== viewMode
        ? { ...box, viewMode, updatedAt: nowIso() }
        : box,
    ),
  };
}

export function setBoxDetailMode(
  snapshot: WorkspaceSnapshot,
  boxId: string,
  detailMode: WorkspaceBoxDetailMode,
) {
  return {
    ...snapshot,
    boxes: snapshot.boxes.map((box) =>
      box.id === boxId && box.detailMode !== detailMode
        ? { ...box, detailMode, updatedAt: nowIso() }
        : box,
    ),
  };
}

export function setBoxPinned(snapshot: WorkspaceSnapshot, boxId: string, isPinned: boolean) {
  return {
    ...snapshot,
    boxes: snapshot.boxes.map((box) =>
      box.id === boxId && box.isPinned !== isPinned
        ? { ...box, isPinned, updatedAt: nowIso() }
        : box,
    ),
  };
}

export function deleteBox(snapshot: WorkspaceSnapshot, boxId: string) {
  const box = snapshot.boxes.find((candidate) => candidate.id === boxId);
  if (!box) {
    return snapshot;
  }

  const recycleBinPage = snapshot.pages.find((page) => isRecycleBinPageId(page.id));
  if (recycleBinPage && !isRecycleBinPageId(box.pageId)) {
    return {
      ...snapshot,
      boxes: snapshot.boxes.map((candidate) =>
        candidate.id === boxId
          ? { ...candidate, pageId: recycleBinPage.id, updatedAt: nowIso() }
          : candidate,
      ),
    };
  }

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

export function updateItemContent(
  snapshot: WorkspaceSnapshot,
  boxId: string,
  itemId: string,
  content: string,
) {
  const nextContent = content.trim();
  if (!nextContent) {
    return snapshot;
  }

  const timestamp = nowIso();
  return {
    ...snapshot,
    boxes: snapshot.boxes.map((box) =>
      box.id === boxId
        ? {
            ...box,
            items: box.items.map((item) => {
              if (item.id !== itemId) return item;
              if (item.type === 'folder')
                return { ...item, path: nextContent, updatedAt: timestamp };
              if (item.type === 'bookmark')
                return { ...item, url: nextContent, updatedAt: timestamp };
              return { ...item, text: nextContent, updatedAt: timestamp };
            }),
            updatedAt: timestamp,
          }
        : box,
    ),
  };
}

export function setItemPinned(
  snapshot: WorkspaceSnapshot,
  boxId: string,
  itemId: string,
  isPinned: boolean,
) {
  const timestamp = nowIso();

  return {
    ...snapshot,
    boxes: snapshot.boxes.map((box) => {
      if (box.id !== boxId || !box.items.some((item) => item.id === itemId)) {
        return box;
      }

      const items = box.items.map((item) =>
        item.id === itemId ? { ...item, isPinned, updatedAt: timestamp } : item,
      );
      return {
        ...box,
        items: [
          ...items.filter((item) => item.isPinned),
          ...items.filter((item) => !item.isPinned),
        ],
        updatedAt: timestamp,
      };
    }),
  };
}

export function reorderItems(snapshot: WorkspaceSnapshot, boxId: string, orderedItemIds: string[]) {
  const box = snapshot.boxes.find((candidate) => candidate.id === boxId);
  if (
    !box ||
    orderedItemIds.length !== box.items.length ||
    new Set(orderedItemIds).size !== orderedItemIds.length ||
    orderedItemIds.some((itemId) => !box.items.some((item) => item.id === itemId))
  ) {
    return snapshot;
  }

  const currentOrder = box.items.map((item) => item.id);
  if (currentOrder.every((itemId, index) => itemId === orderedItemIds[index])) {
    return snapshot;
  }

  const itemsById = new Map(box.items.map((item) => [item.id, item]));
  const orderedItems = orderedItemIds.map((itemId) => itemsById.get(itemId)!);
  return {
    ...snapshot,
    boxes: snapshot.boxes.map((candidate) =>
      candidate.id === boxId
        ? {
            ...candidate,
            items: [
              ...orderedItems.filter((item) => item.isPinned),
              ...orderedItems.filter((item) => !item.isPinned),
            ],
            updatedAt: nowIso(),
          }
        : candidate,
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

function insertWorkspacePage(snapshot: WorkspaceSnapshot, page: ReturnType<typeof createPage>) {
  const recycleBinPage = snapshot.pages.find((candidate) => isRecycleBinPageId(candidate.id));
  const workspacePages = snapshot.pages.filter((candidate) => !isRecycleBinPageId(candidate.id));
  return [
    ...workspacePages,
    page,
    ...(recycleBinPage ? [{ ...recycleBinPage, order: workspacePages.length + 1 }] : []),
  ];
}

function framesEqual(first: BoxFrame, second: BoxFrame) {
  return (
    first.x === second.x &&
    first.y === second.y &&
    first.width === second.width &&
    first.height === second.height
  );
}

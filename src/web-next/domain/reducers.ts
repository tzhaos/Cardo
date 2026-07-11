import {
  isCollectionPageId,
  isRecycleBinPageId,
  isSystemPageId,
  type BoxFrame,
  type BoxItem,
  type WorkspaceBox,
  type WorkspaceBoxDetailMode,
  type WorkspaceBoxPreset,
  type WorkspaceBoxKind,
  type WorkspaceBoxViewMode,
  type WorkspaceSnapshot,
} from './workspace';
import { createPage, createWorkspaceBox, nowIso } from './factories';
import { chooseAvailableBoxAccent, normalizeBoxAccent } from './boxAppearance';
import {
  constrainBoxFrameToCanvas,
  createCanvasWorldBounds,
  type CanvasViewportSize,
} from './canvasGeometry';

export function renamePage(snapshot: WorkspaceSnapshot, pageId: string, title: string) {
  if (isSystemPageId(pageId)) {
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
    snapshot.pages.filter((candidate) => !isSystemPageId(candidate.id)).length,
  );
  return {
    ...snapshot,
    pages: insertWorkspacePage(snapshot, page),
    activePageId: page.id,
  };
}

export function deletePage(snapshot: WorkspaceSnapshot, pageId: string) {
  const workspacePages = snapshot.pages
    .filter((page) => !isSystemPageId(page.id))
    .sort((first, second) => first.order - second.order);
  const collectionPage = snapshot.pages.find((page) => isCollectionPageId(page.id));
  const recycleBinPage = snapshot.pages.find((page) => isRecycleBinPageId(page.id));
  if (
    isSystemPageId(pageId) ||
    workspacePages.length <= 1 ||
    !workspacePages.some((page) => page.id === pageId)
  ) {
    return snapshot;
  }

  const remainingWorkspacePages = workspacePages
    .filter((page) => page.id !== pageId)
    .map((page, order) => ({ ...page, order }));
  const pages = [
    ...(collectionPage ? [{ ...collectionPage, order: -1 }] : []),
    ...remainingWorkspacePages,
  ];
  if (recycleBinPage) {
    pages.push({ ...recycleBinPage, order: remainingWorkspacePages.length });
  }
  const collectionPageId = collectionPage?.id ?? snapshot.activePageId;
  const activePageId = snapshot.activePageId === pageId ? collectionPageId : snapshot.activePageId;
  const defaultPageId =
    snapshot.defaultPageId === pageId ? remainingWorkspacePages[0]!.id : snapshot.defaultPageId;
  const removedBoxIds = new Set(
    snapshot.boxes.filter((box) => box.pageId === pageId).map((box) => box.id),
  );

  return {
    pages,
    activePageId,
    defaultPageId,
    boxes: recycleBinPage
      ? snapshot.boxes.map((box) =>
          box.pageId === pageId ? { ...box, pageId: recycleBinPage.id, updatedAt: nowIso() } : box,
        )
      : snapshot.boxes.filter((box) => box.pageId !== pageId),
    collectionBoxIds: snapshot.collectionBoxIds.filter((boxId) => !removedBoxIds.has(boxId)),
    collectionViews: Object.fromEntries(
      Object.entries(snapshot.collectionViews).filter(([boxId]) => !removedBoxIds.has(boxId)),
    ),
  };
}

export function setDefaultPage(snapshot: WorkspaceSnapshot, pageId: string) {
  if (
    snapshot.defaultPageId === pageId ||
    isSystemPageId(pageId) ||
    !snapshot.pages.some((page) => page.id === pageId)
  ) {
    return snapshot;
  }

  return { ...snapshot, defaultPageId: pageId };
}

export function reorderPages(snapshot: WorkspaceSnapshot, orderedPageIds: string[]) {
  const workspacePages = snapshot.pages.filter((page) => !isSystemPageId(page.id));
  const collectionPage = snapshot.pages.find((page) => isCollectionPageId(page.id));
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
      ...(collectionPage ? [{ ...collectionPage, order: -1 }] : []),
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

export function addBox(
  snapshot: WorkspaceSnapshot,
  pageId: string,
  preset: WorkspaceBoxPreset,
  frame: BoxFrame,
  title?: string,
  kind: WorkspaceBoxKind = 'normal',
) {
  if (isSystemPageId(pageId)) {
    return snapshot;
  }

  return {
    ...snapshot,
    boxes: [
      ...snapshot.boxes,
      createWorkspaceBox(
        pageId,
        preset,
        frame,
        title,
        kind,
        kind === 'temporary'
          ? {}
          : {
              accent: chooseAvailableBoxAccent(
                snapshot.boxes.filter((box) => box.pageId === pageId),
              ),
            },
      ),
    ],
  };
}

export function updateBoxFrame(snapshot: WorkspaceSnapshot, boxId: string, frame: BoxFrame) {
  const box = snapshot.boxes.find((candidate) => candidate.id === boxId);
  if (!box || framesEqual(box.frame, frame)) return snapshot;
  return {
    ...snapshot,
    boxes: snapshot.boxes.map((candidate) =>
      candidate.id === boxId ? { ...candidate, frame, updatedAt: nowIso() } : candidate,
    ),
  };
}

export function updatePageBoxFrames(
  snapshot: WorkspaceSnapshot,
  pageId: string,
  frames: Record<string, BoxFrame>,
) {
  let changed = false;
  const boxes = snapshot.boxes.map((box) => {
    const frame = box.pageId === pageId ? frames[box.id] : undefined;
    if (!frame || framesEqual(frame, box.frame)) return box;
    changed = true;
    return { ...box, frame, updatedAt: nowIso() };
  });
  return changed ? { ...snapshot, boxes } : snapshot;
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

export function setBoxPreset(
  snapshot: WorkspaceSnapshot,
  boxId: string,
  preset: WorkspaceBoxPreset,
) {
  return {
    ...snapshot,
    boxes: snapshot.boxes.map((box) =>
      box.id === boxId && box.preset !== preset ? { ...box, preset, updatedAt: nowIso() } : box,
    ),
  };
}

export function setBoxAppearance(
  snapshot: WorkspaceSnapshot,
  boxId: string,
  appearance: Pick<WorkspaceBox, 'icon' | 'accent'>,
) {
  const accent = appearance.accent ? normalizeBoxAccent(appearance.accent) : null;
  return {
    ...snapshot,
    boxes: snapshot.boxes.map((box) =>
      box.id === boxId
        ? {
            ...box,
            ...(appearance.icon ? { icon: appearance.icon } : {}),
            ...(accent ? { accent } : {}),
            updatedAt: nowIso(),
          }
        : box,
    ),
  };
}

export function promoteTemporaryBox(snapshot: WorkspaceSnapshot, boxId: string, title: string) {
  const nextTitle = title.trim();
  if (!nextTitle) return snapshot;

  return {
    ...snapshot,
    boxes: snapshot.boxes.map((box) =>
      box.id === boxId && box.kind === 'temporary'
        ? { ...box, kind: 'normal' as const, title: nextTitle, updatedAt: nowIso() }
        : box,
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

export function setBoxLocked(snapshot: WorkspaceSnapshot, boxId: string, isLocked: boolean) {
  return {
    ...snapshot,
    boxes: snapshot.boxes.map((box) =>
      box.id === boxId && box.isLocked !== isLocked
        ? { ...box, isLocked, updatedAt: nowIso() }
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
      collectionBoxIds: snapshot.collectionBoxIds.filter((id) => id !== boxId),
      collectionViews: omitCollectionView(snapshot.collectionViews, boxId),
    };
  }

  return {
    ...snapshot,
    boxes: snapshot.boxes.filter((box) => box.id !== boxId),
    collectionBoxIds: snapshot.collectionBoxIds.filter((id) => id !== boxId),
    collectionViews: omitCollectionView(snapshot.collectionViews, boxId),
  };
}

export function addBoxToCollection(snapshot: WorkspaceSnapshot, boxId: string) {
  const box = snapshot.boxes.find((candidate) => candidate.id === boxId);
  if (!box || isRecycleBinPageId(box.pageId) || snapshot.collectionBoxIds.includes(boxId)) {
    return snapshot;
  }

  return {
    ...snapshot,
    activePageId: snapshot.pages.some((page) => isCollectionPageId(page.id))
      ? snapshot.pages.find((page) => isCollectionPageId(page.id))!.id
      : snapshot.activePageId,
    collectionBoxIds: [...snapshot.collectionBoxIds, boxId],
    collectionViews: {
      ...snapshot.collectionViews,
      [boxId]: createCollectionView(box, snapshot.collectionBoxIds.length),
    },
  };
}

export function removeBoxFromCollection(snapshot: WorkspaceSnapshot, boxId: string) {
  const collectionBoxIds = snapshot.collectionBoxIds;
  if (!collectionBoxIds.includes(boxId)) return snapshot;
  return {
    ...snapshot,
    collectionBoxIds: collectionBoxIds.filter((id) => id !== boxId),
    collectionViews: omitCollectionView(snapshot.collectionViews, boxId),
  };
}

export function updateCollectionBoxView(
  snapshot: WorkspaceSnapshot,
  boxId: string,
  patch: Partial<Omit<NonNullable<WorkspaceSnapshot['collectionViews']>[string], 'boxId'>>,
) {
  if (!snapshot.collectionBoxIds.includes(boxId)) return snapshot;
  const box = snapshot.boxes.find((candidate) => candidate.id === boxId);
  if (!box) return snapshot;
  const current = snapshot.collectionViews[boxId];
  if (!current) return snapshot;
  return {
    ...snapshot,
    collectionViews: {
      ...snapshot.collectionViews,
      [boxId]: { ...current, ...patch, boxId },
    },
  };
}

export function updateCollectionBoxFrames(
  snapshot: WorkspaceSnapshot,
  frames: Record<string, BoxFrame>,
) {
  const entries = Object.entries(frames).filter(([boxId]) =>
    snapshot.collectionBoxIds.includes(boxId),
  );
  if (!entries.length) return snapshot;
  const collectionViews = { ...snapshot.collectionViews };
  for (const [boxId, frame] of entries) {
    const box = snapshot.boxes.find((candidate) => candidate.id === boxId);
    if (!box) continue;
    const current =
      collectionViews[boxId] ?? createCollectionView(box, snapshot.collectionBoxIds.indexOf(boxId));
    collectionViews[boxId] = { ...current, frame };
  }
  return { ...snapshot, collectionViews };
}

function createCollectionView(box: WorkspaceBox, index: number) {
  return {
    boxId: box.id,
    frame: {
      x: 64 + (index % 3) * 350,
      y: 92 + Math.floor(index / 3) * 290,
      width: Math.max(280, Math.min(520, box.frame.width)),
      height: Math.max(220, Math.min(460, box.frame.height)),
    },
    viewMode: box.viewMode,
    detailMode: box.detailMode,
    order: index,
  };
}

function omitCollectionView(views: WorkspaceSnapshot['collectionViews'], boxId: string) {
  if (!views[boxId]) return views;
  return Object.fromEntries(Object.entries(views).filter(([id]) => id !== boxId));
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
              if (item.type === 'folder' || item.type === 'file' || item.type === 'shortcut')
                return { ...item, path: nextContent, updatedAt: timestamp };
              if (item.type === 'bookmark')
                return { ...item, url: nextContent, favicon: undefined, updatedAt: timestamp };
              return { ...item, text: nextContent, updatedAt: timestamp };
            }),
            updatedAt: timestamp,
          }
        : box,
    ),
  };
}

export function setBookmarkFavicon(
  snapshot: WorkspaceSnapshot,
  boxId: string,
  itemId: string,
  favicon: string,
) {
  if (!favicon.startsWith('data:image/')) return snapshot;
  let changed = false;
  const boxes = snapshot.boxes.map((box) => {
    if (box.id !== boxId) return box;
    const items = box.items.map((item) => {
      if (item.id !== itemId || item.type !== 'bookmark' || item.favicon === favicon) return item;
      changed = true;
      return { ...item, favicon };
    });
    return changed ? { ...box, items } : box;
  });
  return changed ? { ...snapshot, boxes } : snapshot;
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

export function moveItemBetweenBoxes(
  snapshot: WorkspaceSnapshot,
  sourceBoxId: string,
  targetBoxId: string,
  itemId: string,
  targetIndex?: number,
) {
  if (sourceBoxId === targetBoxId) return snapshot;

  const sourceBox = snapshot.boxes.find((box) => box.id === sourceBoxId);
  const targetBox = snapshot.boxes.find((box) => box.id === targetBoxId);
  const item = sourceBox?.items.find((candidate) => candidate.id === itemId);
  if (
    !sourceBox ||
    !targetBox ||
    !item ||
    targetBox.items.some((candidate) => candidate.id === itemId)
  ) {
    return snapshot;
  }

  const timestamp = nowIso();
  const targetItems = [...targetBox.items];
  const insertionIndex = Math.max(
    0,
    Math.min(targetIndex ?? targetItems.length, targetItems.length),
  );
  targetItems.splice(insertionIndex, 0, item);
  const groupedTargetItems = [
    ...targetItems.filter((candidate) => candidate.isPinned),
    ...targetItems.filter((candidate) => !candidate.isPinned),
  ];

  const boxes = snapshot.boxes.map((box) => {
    if (box.id === sourceBoxId) {
      return {
        ...box,
        items: box.items.filter((candidate) => candidate.id !== itemId),
        updatedAt: timestamp,
      };
    }
    if (box.id === targetBoxId) {
      return { ...box, items: groupedTargetItems, updatedAt: timestamp };
    }
    return box;
  });

  return {
    ...snapshot,
    boxes: boxes.filter((box) => box.kind !== 'temporary' || box.items.length > 0),
  };
}

export function deleteItem(snapshot: WorkspaceSnapshot, boxId: string, itemId: string) {
  const boxes = snapshot.boxes.map((box) =>
    box.id === boxId
      ? {
          ...box,
          items: box.items.filter((item) => item.id !== itemId),
          updatedAt: nowIso(),
        }
      : box,
  );

  return {
    ...snapshot,
    boxes: boxes.filter((box) => box.kind !== 'temporary' || box.items.length > 0),
  };
}

export function moveBoxToPage(
  snapshot: WorkspaceSnapshot,
  boxId: string,
  pageId: string,
  frame?: BoxFrame,
) {
  if (isCollectionPageId(pageId) || !snapshot.pages.some((page) => page.id === pageId)) {
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
  const collectionPage = snapshot.pages.find((candidate) => isCollectionPageId(candidate.id));
  const recycleBinPage = snapshot.pages.find((candidate) => isRecycleBinPageId(candidate.id));
  const workspacePages = snapshot.pages.filter((candidate) => !isSystemPageId(candidate.id));
  return [
    ...(collectionPage ? [{ ...collectionPage, order: -1 }] : []),
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

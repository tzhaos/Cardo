import {
  createWorkspaceItem,
  getWorkspaceItemContent,
  type ItemDraft,
  type WorkspaceItem,
} from '../domains/items/model/item';
import { parseTextToItemDraft } from '../domains/items/services/parseTextToItemDraft';
import {
  MAX_WORKSPACE_BOXES,
  type WorkspaceBox,
  type WorkspaceCommand,
  type WorkspaceSnapshot,
} from '../domains/workspace/model/workspace';
import {
  createWorkspaceExportDocument,
  parseWorkspaceExportDocument,
} from '../domains/workspace/model/workspaceCodec';
import {
  areAllBoxesMinimized,
  findBoxByRole,
  getWorkspaceBox,
  getOrderedBoxes,
} from '../domains/workspace/model/workspaceSelectors';
import type { ClipboardPort } from '../ports/ClipboardPort';
import type { FileExportPort } from '../ports/FileExportPort';
import type { FileImportPort } from '../ports/FileImportPort';
import type { LocalResourcePort } from '../ports/LocalResourcePort';
import type { TabsPort } from '../ports/TabsPort';

export type IdFactory = (prefix: string) => string;
export type WorkspaceDispatch = (command: WorkspaceCommand) => void;

export type OpenItemResult =
  | { status: 'opened-url' }
  | { status: 'copied-note' }
  | { status: 'requested-local-resource' }
  | { status: 'failed'; errorMessage: string };

export type CreateWorkspaceBoxResult =
  | { status: 'created'; box: WorkspaceBox; command: WorkspaceCommand }
  | { status: 'limit-reached'; limit: number };

export interface PastedWorkspaceItemResult {
  boxId: string;
  item: WorkspaceItem;
  command: WorkspaceCommand;
}

export async function openWorkspaceItem(
  item: WorkspaceItem,
  ports: Pick<TabsPort, 'openUrl'> &
    Pick<ClipboardPort, 'writeText'> &
    Pick<LocalResourcePort, 'requestOpen'>,
): Promise<OpenItemResult> {
  try {
    if (item.type === 'url') {
      ports.openUrl(item.url);
      return { status: 'opened-url' };
    }

    if (item.type === 'note') {
      await ports.writeText(item.text);
      return { status: 'copied-note' };
    }

    const result = await ports.requestOpen(getWorkspaceItemContent(item));

    return result.status === 'requested'
      ? { status: 'requested-local-resource' }
      : { status: 'failed', errorMessage: result.errorMessage };
  } catch (error) {
    return {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unexpected error',
    };
  }
}

export async function readClipboardItemDraft(clipboard: Pick<ClipboardPort, 'readText'>) {
  const clipboardText = await clipboard.readText();
  return clipboardText ? parseTextToItemDraft(clipboardText) : null;
}

export function exportWorkspaceSnapshot(
  snapshot: Pick<
    WorkspaceSnapshot,
    'boxesById' | 'boxOrder' | 'boxViewStatesById' | 'itemsById' | 'itemPlacementsByBoxId'
  >,
  fileExport: FileExportPort,
  filenamePrefix: string,
  now = new Date(),
) {
  const payload = JSON.stringify(createWorkspaceExportDocument(snapshot), null, 2);
  const filename = `${filenamePrefix}-${now.toISOString().slice(0, 10)}.json`;

  fileExport.downloadJson(filename, payload);
}

export async function readWorkspaceImportDocument(source: unknown, fileImport: FileImportPort) {
  const fileContents = await fileImport.readText(source);
  return parseWorkspaceExportDocument(JSON.parse(fileContents) as unknown);
}

export function createAddItemCommand(boxId: string, draft: ItemDraft, createId: IdFactory) {
  const item = createWorkspaceItem(createId('item'), draft);

  return {
    item,
    command: {
      type: 'item.add',
      boxId,
      item,
    } satisfies WorkspaceCommand,
  };
}

export function createMoveItemCommand(
  itemId: string,
  sourceBoxId: string,
  targetBoxId: string,
  targetIndex?: number,
): WorkspaceCommand {
  return {
    type: 'item.move',
    itemId,
    sourceBoxId,
    targetBoxId,
    ...(targetIndex !== undefined ? { targetIndex } : {}),
  };
}

export function createToggleAllBoxesMinimizedCommand(snapshot: WorkspaceSnapshot) {
  return {
    areBoxesNowMinimized: !areAllBoxesMinimized(snapshot),
    command: { type: 'workspace.toggleAllBoxesMinimized' } satisfies WorkspaceCommand,
  };
}

export function createPasteTextCommand(
  snapshot: WorkspaceSnapshot,
  text: string,
  activeBoxId: string | null,
  createId: IdFactory,
): PastedWorkspaceItemResult | null {
  const draft = parseTextToItemDraft(text);
  const targetRole =
    draft.type === 'url'
      ? 'links'
      : draft.type === 'file' || draft.type === 'folder'
        ? 'folders'
        : 'notes';

  const targetBox =
    (activeBoxId ? getWorkspaceBox(snapshot, activeBoxId) : null) ??
    findBoxByRole(snapshot, targetRole) ??
    getOrderedBoxes(snapshot)[0] ??
    null;

  if (!targetBox) {
    return null;
  }

  const { item, command } = createAddItemCommand(targetBox.id, draft, createId);

  return {
    boxId: targetBox.id,
    item,
    command,
  };
}

export function createWorkspaceBoxCommand(
  snapshot: WorkspaceSnapshot,
  viewport: { width: number; height: number },
  createId: IdFactory,
): CreateWorkspaceBoxResult {
  if (snapshot.boxOrder.length >= MAX_WORKSPACE_BOXES) {
    return {
      status: 'limit-reached',
      limit: MAX_WORKSPACE_BOXES,
    };
  }

  const box: WorkspaceBox = {
    id: createId('box'),
    role: null,
    customTitle: null,
    bounds: {
      x: viewport.width / 2 - 160,
      y: viewport.height / 2 - 200,
      width: 320,
      height: 400,
    },
    isLocked: false,
    isCollapsed: false,
    isMinimized: false,
    layout: 'list',
    zIndex: snapshot.maxZIndex + 1,
  };

  return {
    status: 'created',
    box,
    command: {
      type: 'box.create',
      box,
    },
  };
}

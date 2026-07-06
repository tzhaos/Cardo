import {
  createWorkspaceItem,
  getWorkspaceItemContent,
  type ItemDraft,
  type WorkspaceItem,
} from '../domains/items/model/item';
import { parseTextToItemDraft } from '../domains/items/services/parseTextToItemDraft';
import {
  DEFAULT_BOX_TEMPLATE_ID,
  MAX_WORKSPACE_BOXES,
  type BoxTemplateId,
  type WorkspaceBox,
  type WorkspaceCommand,
  type WorkspaceSnapshot,
} from '../domains/workspace/model/workspace';
import {
  createDefaultTemplateItems,
  createDefaultTemplateState,
  getBoxTemplateDefinition,
} from '../domains/workspace/model/boxTemplates';
import {
  createWorkspaceExportDocument,
  parseWorkspaceExportDocument,
} from '../domains/workspace/model/workspaceCodec';
import { getWorkspaceBox, getOrderedBoxes } from '../domains/workspace/model/workspaceSelectors';
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
  | {
      status: 'created';
      box: WorkspaceBox;
      command: Extract<WorkspaceCommand, { type: 'box.create' }>;
    }
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
    | 'boxesById'
    | 'boxOrder'
    | 'boxViewStatesById'
    | 'itemsById'
    | 'itemPlacementsByBoxId'
    | 'bookmarksById'
    | 'bookmarkFoldersById'
    | 'bookmarkFolderOrder'
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

export function createAddItemCommand(
  boxId: string,
  draft: ItemDraft,
  createId: IdFactory,
  columnId?: string,
) {
  const item = createWorkspaceItem(createId('item'), draft);

  return {
    item,
    command: {
      type: 'item.add',
      boxId,
      item,
      ...(columnId ? { columnId } : {}),
    } satisfies WorkspaceCommand,
  };
}

export function createMoveItemCommand(
  itemId: string,
  sourceBoxId: string,
  targetBoxId: string,
  targetIndex?: number,
  targetColumnId?: string,
): WorkspaceCommand {
  return {
    type: 'item.move',
    itemId,
    sourceBoxId,
    targetBoxId,
    ...(targetIndex !== undefined ? { targetIndex } : {}),
    ...(targetColumnId ? { targetColumnId } : {}),
  };
}

export function createPasteTextCommand(
  snapshot: WorkspaceSnapshot,
  text: string,
  activeBoxId: string | null,
  createId: IdFactory,
): PastedWorkspaceItemResult | null {
  const draft = parseTextToItemDraft(text);
  const orderedBoxes = getOrderedBoxes(snapshot);

  const targetBox =
    (activeBoxId ? getWorkspaceBox(snapshot, activeBoxId) : null) ??
    orderedBoxes.find((box) => box.templateId === 'inbox') ??
    orderedBoxes[0] ??
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
  placement: { centerX: number; centerY: number; templateId?: BoxTemplateId },
  createId: IdFactory,
): CreateWorkspaceBoxResult {
  if (snapshot.boxOrder.length >= MAX_WORKSPACE_BOXES) {
    return {
      status: 'limit-reached',
      limit: MAX_WORKSPACE_BOXES,
    };
  }

  const templateId = placement.templateId ?? DEFAULT_BOX_TEMPLATE_ID;
  const template = getBoxTemplateDefinition(templateId);
  const size = template.defaultBounds;
  const boxId = createId('box');
  const defaultItems = createDefaultTemplateItems(templateId).map((defaultItem) => {
    const item = createWorkspaceItem(createId('item'), defaultItem.draft);

    return {
      item,
      placement: {
        itemId: item.id,
        isPinned: defaultItem.isPinned ?? false,
        ...(defaultItem.columnId ? { columnId: defaultItem.columnId } : {}),
      },
    };
  });
  const box: WorkspaceBox = {
    id: boxId,
    customTitle: null,
    templateId,
    templateState: createDefaultTemplateState(templateId),
    bounds: {
      x: placement.centerX - size.width / 2,
      y: placement.centerY - size.height / 2,
      width: size.width,
      height: size.height,
    },
    isLocked: false,
    isCollapsed: false,
    isMinimized: false,
    layout: template.defaultLayout,
    zIndex: snapshot.maxZIndex + 1,
  };

  return {
    status: 'created',
    box,
    command: {
      type: 'box.create',
      box,
      ...(defaultItems.length > 0
        ? {
            items: defaultItems.map(({ item }) => item),
            placements: defaultItems.map(({ placement }) => placement),
          }
        : {}),
    },
  };
}

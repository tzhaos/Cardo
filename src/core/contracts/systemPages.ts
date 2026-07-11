import { z } from 'zod';

export const COLLECTION_PAGE_ID = 'cardo-collection';
export const RECYCLE_BIN_PAGE_ID = 'cardo-recycle-bin';
export const systemPageIds = [COLLECTION_PAGE_ID, RECYCLE_BIN_PAGE_ID] as const;
export const systemPageIdSchema = z.enum(systemPageIds);

export type SystemPageId = z.infer<typeof systemPageIdSchema>;

export function isCollectionPageId(pageId: string): pageId is typeof COLLECTION_PAGE_ID {
  return pageId === COLLECTION_PAGE_ID;
}

export function isRecycleBinPageId(pageId: string): pageId is typeof RECYCLE_BIN_PAGE_ID {
  return pageId === RECYCLE_BIN_PAGE_ID;
}

export function isSystemPageId(pageId: string): pageId is SystemPageId {
  return isCollectionPageId(pageId) || isRecycleBinPageId(pageId);
}

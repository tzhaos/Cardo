import { eq } from 'drizzle-orm';
import type { DatabaseTransaction } from '../application/commandTypes';
import type { KhaosDatabase } from './createDatabaseClient';
import { RUNTIME_META_ID, runtimeMeta } from './schema';

type RevisionDb = DatabaseTransaction | KhaosDatabase;

/**
 * Read the multi-client revision counter. Requires runtime_meta row (schema v4+).
 */
export async function getRevision(db: RevisionDb): Promise<number> {
  const row = await db
    .select({ revision: runtimeMeta.revision })
    .from(runtimeMeta)
    .where(eq(runtimeMeta.id, RUNTIME_META_ID))
    .get();
  if (!row) {
    throw new Error('runtime_meta row is missing; database migrations may not have been applied.');
  }
  return row.revision;
}

/**
 * Increment revision by 1 in the same transaction as a successful mutation.
 * Never include runtime_meta in history change sets; undo/redo also call this (forward only).
 */
export async function bumpRevision(db: RevisionDb): Promise<number> {
  const current = await getRevision(db);
  const next = current + 1;
  await db
    .update(runtimeMeta)
    .set({ revision: next })
    .where(eq(runtimeMeta.id, RUNTIME_META_ID));
  return next;
}

import type { KhaosDatabase } from '../database/createDatabaseClient';
import type { HistoryChangeSet } from '../contracts/workspace';

export type DatabaseTransaction = Parameters<
  Parameters<KhaosDatabase['transaction']>[0]
>[0];

export interface DatabaseCommandResult {
  createdPageId?: string;
  createdBoxId?: string;
  createdItemId?: string;
}

export interface DatabaseCommandMutation {
  changes: HistoryChangeSet;
  result?: DatabaseCommandResult;
}

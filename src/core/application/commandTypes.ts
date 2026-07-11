import type { CardoDatabase } from '../database/createDatabaseClient';
import type { HistoryChangeSet } from '../contracts/history';

export type DatabaseTransaction = Parameters<Parameters<CardoDatabase['transaction']>[0]>[0];

export interface DatabaseCommandResult {
  createdPageId?: string;
  createdBoxId?: string;
  createdItemId?: string;
}

export interface DatabaseCommandMutation {
  changes: HistoryChangeSet;
  result?: DatabaseCommandResult;
}

'use client';

import Dexie, { type EntityTable } from 'dexie';
import type { MatchEventInput } from '@/lib/schemas';

export interface QueuedEvent extends MatchEventInput {
  id?: number;            // dexie pk
  status: 'pending' | 'syncing' | 'failed';
  attempts: number;
  last_error?: string;
  queued_at: number;
}

class HaMigrashDB extends Dexie {
  events!: EntityTable<QueuedEvent, 'id'>;
  constructor() {
    super('hamigrash');
    this.version(1).stores({
      events: '++id, client_id, match_id, status, queued_at',
    });
  }
}

let db: HaMigrashDB | null = null;
function getDB() {
  if (typeof window === 'undefined') throw new Error('idb_only_in_browser');
  if (!db) db = new HaMigrashDB();
  return db;
}

export async function enqueueEvent(input: MatchEventInput) {
  const row: QueuedEvent = { ...input, status: 'pending', attempts: 0, queued_at: Date.now() };
  await getDB().events.add(row);
  return row;
}

export async function listPending(matchId: string) {
  return getDB().events.where({ match_id: matchId, status: 'pending' }).toArray();
}

export async function listAllPending() {
  return getDB().events.where('status').anyOf(['pending', 'failed']).toArray();
}

export async function markSynced(clientId: string) {
  const row = await getDB().events.where({ client_id: clientId }).first();
  if (row?.id != null) await getDB().events.delete(row.id);
}

export async function markFailed(clientId: string, err: string) {
  const row = await getDB().events.where({ client_id: clientId }).first();
  if (row?.id != null) {
    await getDB().events.update(row.id, { status: 'failed', last_error: err, attempts: (row.attempts ?? 0) + 1 });
  }
}

export async function markSyncing(clientId: string) {
  const row = await getDB().events.where({ client_id: clientId }).first();
  if (row?.id != null) await getDB().events.update(row.id, { status: 'syncing' });
}

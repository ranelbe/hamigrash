'use client';

import { listAllPending, markFailed, markSynced, markSyncing } from './event-queue';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

let syncing = false;

export async function syncQueue() {
  if (syncing) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  syncing = true;
  try {
    const pending = await listAllPending();
    const supabase = getSupabaseBrowserClient();
    for (const ev of pending) {
      await markSyncing(ev.client_id);
      const { error } = await supabase.from('match_events').upsert(
        {
          client_id: ev.client_id,
          match_id: ev.match_id,
          team_id: ev.team_id ?? null,
          player_id: ev.player_id ?? null,
          related_player_id: ev.related_player_id ?? null,
          event_type: ev.event_type,
          period: ev.period,
          minute: ev.minute ?? null,
          extra_minute: ev.extra_minute ?? 0,
          payload: ev.payload ?? {},
        },
        { onConflict: 'client_id' },
      );
      if (error) {
        await markFailed(ev.client_id, error.message);
      } else {
        await markSynced(ev.client_id);
      }
    }
  } finally {
    syncing = false;
  }
}

let installed = false;
export function installSyncListeners() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('online', () => { void syncQueue(); });
  // Periodic safety net
  setInterval(() => { void syncQueue(); }, 15_000);
}

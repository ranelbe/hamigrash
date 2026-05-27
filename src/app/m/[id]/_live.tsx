'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

// Subscribes to match_events realtime changes and refreshes the
// server-rendered page when new events arrive — keeps the
// public view live without bundling event-shaped client logic.
export function PublicMatchLive({ matchId }: { matchId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`match:${matchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_events', filter: `match_id=eq.${matchId}` },
          () => router.refresh())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
          () => router.refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchId, router]);
  return null;
}

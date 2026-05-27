import type { Player } from '@/lib/supabase/database.types';
import { he } from '@/lib/i18n/he';
import { ovrColor, contrastText } from '@/lib/utils';

export function PlayerCard({ player }: { player: Player & { team?: { name?: string; primary_color?: string; short_name?: string | null } } }) {
  const isGK = player.position === 'GK';
  const ovr = isGK
    ? avg([player.rating_gk_diving, player.rating_gk_handling, player.rating_gk_kicking, player.rating_gk_reflexes, player.rating_gk_speed, player.rating_gk_positioning])
    : avg([player.rating_pace, player.rating_shooting, player.rating_passing, player.rating_dribbling, player.rating_defending, player.rating_physical]);

  const rows: { label: string; value: number | null }[] = isGK ? [
    { label: he.player.gkDiving, value: player.rating_gk_diving },
    { label: he.player.gkHandling, value: player.rating_gk_handling },
    { label: he.player.gkKicking, value: player.rating_gk_kicking },
    { label: he.player.gkReflexes, value: player.rating_gk_reflexes },
    { label: he.player.gkSpeed, value: player.rating_gk_speed },
    { label: he.player.gkPositioning, value: player.rating_gk_positioning },
  ] : [
    { label: he.player.pace,      value: player.rating_pace },
    { label: he.player.shooting,  value: player.rating_shooting },
    { label: he.player.passing,   value: player.rating_passing },
    { label: he.player.dribbling, value: player.rating_dribbling },
    { label: he.player.defending, value: player.rating_defending },
    { label: he.player.physical,  value: player.rating_physical },
  ];

  return (
    <div className="rounded-xl2 overflow-hidden shadow-cardLg" style={{ background: `linear-gradient(160deg, ${player.team?.primary_color ?? '#16a34a'}, #0f172a)` }}>
      <div className="p-5" style={{ color: '#ffffff' }}>
        <div className="flex items-start justify-between">
          <div>
            <div className={`inline-flex items-center justify-center size-14 rounded-xl font-display font-bold text-2xl tabular ${ovrColor(ovr)}`}>{ovr}</div>
            <div className="mt-2 font-display font-bold text-xl truncate">{player.display_name}</div>
            <div className="text-sm opacity-80">{he.player.positions[player.position]} · #{player.squad_number ?? '—'}</div>
            <div className="text-xs opacity-70 mt-0.5">{player.team?.name}</div>
          </div>
          <div className="size-20 rounded-xl bg-white/10 overflow-hidden">
            {player.photo_url && <img src={player.photo_url} alt="" className="w-full h-full object-cover" />}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-sm tabular">
          {rows.map(r => (
            <div key={r.label} className="flex items-center justify-between border-b border-white/10 py-1">
              <span className="opacity-80">{r.label}</span>
              <span className="font-bold">{r.value ?? '—'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function avg(arr: (number | null)[]) {
  const xs = arr.filter((x): x is number => x != null);
  if (!xs.length) return 0;
  return Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
}

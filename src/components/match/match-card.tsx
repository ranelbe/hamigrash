import Link from 'next/link';
import { MapPin, Trophy, Handshake } from 'lucide-react';
import { TeamBadge } from '@/components/team/team-badge';
import { he } from '@/lib/i18n/he';
import { formatHebrewDate, formatHebrewTime } from '@/lib/utils';

type Team = { id?: string; name: string; short_name?: string | null; primary_color?: string | null };

type Props = {
  id: string;
  home: Team;
  away: Team;
  status: 'scheduled' | 'live' | 'finished' | 'cancelled';
  scheduledAt?: string | null;
  homeGoals?: number | null;
  awayGoals?: number | null;
  venue?: string | null;
  href?: string;
  // Competition context — shown as a small header chip so the viewer
  // immediately knows whether this is a league match, a cup match, or
  // a one-off friendly. Pass null/undefined to hide the chip.
  competitionType?: 'league' | 'cup' | 'friendly' | null;
  competitionName?: string | null;
  competitionId?: string | null;
  // Round / matchday label (e.g. 'מחזור 3' for a league, 'חצי גמר' for a cup).
  roundLabel?: string | null;
};

// One match card — used in lists and round groups.
// Score shown when status is live/finished, otherwise time.
export function MatchCard({
  id, home, away, status, scheduledAt, homeGoals, awayGoals, venue, href,
  competitionType, competitionName, competitionId, roundLabel,
}: Props) {
  const showScore = status === 'live' || status === 'finished';
  const linkHref = href ?? `/matches/${id}`;
  return (
    <div className="rounded-xl2 bg-white dark:bg-ink-800 border border-ink-100 dark:border-ink-700 hover:border-pitch-300 dark:hover:border-pitch-700 transition-colors overflow-hidden">
      {/* Competition context strip — league / cup / friendly indicator */}
      {(competitionType || roundLabel) && (
        <CompetitionStrip
          type={competitionType ?? 'friendly'}
          name={competitionName ?? null}
          competitionId={competitionId ?? null}
          roundLabel={roundLabel ?? null}
        />
      )}
      <Link href={linkHref} className="block group">
        <div className="px-5 py-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            {/* Home (right-aligned in RTL) */}
            <div className="flex items-center gap-3 justify-end min-w-0">
              <span className="font-medium truncate text-ink-900 dark:text-ink-100">{home.name}</span>
              <TeamBadge team={home} size="md" />
            </div>

            {/* Score / Time */}
            <div className="flex flex-col items-center gap-1.5 min-w-[88px]">
              {showScore ? (
                <div className="font-display text-2xl font-bold tabular text-ink-900 dark:text-ink-50">
                  {homeGoals ?? 0}<span className="mx-1 text-ink-400">:</span>{awayGoals ?? 0}
                </div>
              ) : (
                <div className="font-display text-sm tabular text-ink-600 dark:text-ink-300">
                  {scheduledAt ? formatHebrewTime(scheduledAt) : he.match.vs}
                </div>
              )}
              <StatusBadge status={status} />
            </div>

            {/* Away (left-aligned in RTL) */}
            <div className="flex items-center gap-3 min-w-0">
              <TeamBadge team={away} size="md" />
              <span className="font-medium truncate text-ink-900 dark:text-ink-100">{away.name}</span>
            </div>
          </div>

          {(scheduledAt || venue) && (
            <div className="mt-2 flex items-center justify-center gap-3 text-xs text-ink-500 dark:text-ink-400 flex-wrap">
              {scheduledAt && !showScore && <span className="tabular">{formatHebrewDate(scheduledAt)}</span>}
              {venue && <span className="inline-flex items-center gap-1 truncate"><MapPin className="size-3 shrink-0" />{venue}</span>}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}

// Slim header above the team line. Colour-coded per competition type so
// it's recognisable at a glance even when scrolling fast.
function CompetitionStrip({
  type, name, competitionId, roundLabel,
}: {
  type: 'league' | 'cup' | 'friendly';
  name: string | null;
  competitionId: string | null;
  roundLabel: string | null;
}) {
  const style = {
    league:   { bg: 'bg-pitch-50 dark:bg-pitch-950/40 text-pitch-800 dark:text-pitch-200 border-pitch-100 dark:border-pitch-900', icon: <Trophy className="size-3.5" />,    label: 'ליגה' },
    cup:      { bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-100 dark:border-amber-900', icon: <Trophy className="size-3.5" />,    label: 'גביע' },
    friendly: { bg: 'bg-ink-50  dark:bg-ink-700/40    text-ink-700  dark:text-ink-200   border-ink-100  dark:border-ink-700',    icon: <Handshake className="size-3.5" />, label: 'ידידותי' },
  }[type];
  // The competition name (and link, if id present) takes precedence over
  // the generic type label — but the icon + tone stays type-coded.
  return (
    <div className={`flex items-center gap-2 px-4 py-1.5 text-xs border-b ${style.bg}`}>
      {style.icon}
      <span className="font-medium">{style.label}</span>
      {(name || roundLabel) && <span className="opacity-50">·</span>}
      {name && (
        competitionId
          ? <Link href={`/competitions/${competitionId}`} className="hover:underline truncate font-medium">{name}</Link>
          : <span className="truncate font-medium">{name}</span>
      )}
      {roundLabel && (
        <>
          {name && <span className="opacity-50">·</span>}
          <span className="opacity-80">{roundLabel}</span>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Props['status'] }) {
  const map = {
    live:      { bg: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200',           dot: true,  label: he.match.live },
    finished:  { bg: 'bg-pitch-100 text-pitch-700 dark:bg-pitch-950 dark:text-pitch-200',   dot: false, label: he.match.finished },
    scheduled: { bg: 'bg-ink-100 text-ink-700 dark:bg-ink-700 dark:text-ink-200',           dot: false, label: he.match.scheduled },
    cancelled: { bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',   dot: false, label: he.match.cancelled },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${map.bg}`}>
      {map.dot && <span className="size-1.5 rounded-full bg-red-600 live-dot" />}
      {map.label}
    </span>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useRouter } from 'next/navigation';
import { Play, Square, Pause, RotateCcw, Edit3 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { he } from '@/lib/i18n/he';
import { enqueueEvent } from '@/lib/offline/event-queue';
import { installSyncListeners, syncQueue } from '@/lib/offline/sync';
import type { MatchEventType } from '@/lib/supabase/database.types';

type Player = { id: string; display_name: string; squad_number: number | null; position: string };
type Side = 'home' | 'away';

const QUICK_EVENTS: { type: MatchEventType; label: string; tone: 'pitch' | 'amber' | 'red' | 'sky' }[] = [
  { type: 'goal',           label: he.match.events.goal,           tone: 'pitch' },
  { type: 'assist',         label: he.match.events.assist,         tone: 'pitch' },
  { type: 'yellow_card',    label: he.match.events.yellow_card,    tone: 'amber' },
  { type: 'red_card',       label: he.match.events.red_card,       tone: 'red' },
  { type: 'save',           label: he.match.events.save,           tone: 'sky' },
  { type: 'penalty_scored', label: he.match.events.penalty_scored, tone: 'pitch' },
  { type: 'penalty_missed', label: he.match.events.penalty_missed, tone: 'amber' },
  { type: 'own_goal',       label: he.match.events.own_goal,       tone: 'red' },
];

const TONE_CLASS: Record<string, string> = {
  pitch: 'hover:bg-pitch-50 hover:ring-pitch-300 dark:hover:bg-pitch-950 dark:hover:ring-pitch-700',
  amber: 'hover:bg-amber-50 hover:ring-amber-300 dark:hover:bg-amber-950 dark:hover:ring-amber-700',
  red:   'hover:bg-red-50 hover:ring-red-300 dark:hover:bg-red-950 dark:hover:ring-red-700',
  sky:   'hover:bg-sky-50 hover:ring-sky-300 dark:hover:bg-sky-950 dark:hover:ring-sky-700',
};

export function LiveTracker(props: {
  matchId: string;
  home: { id: string; name: string };
  away: { id: string; name: string };
  homePlayers: Player[];
  awayPlayers: Player[];
  numberOfPeriods: number;
  periodLengthMin: number;
  startedAt?: string | null;
  status: 'scheduled' | 'live' | 'finished' | 'cancelled';
}) {
  const { matchId, home, away, homePlayers, awayPlayers, numberOfPeriods, periodLengthMin, startedAt, status } = props;
  const router = useRouter();
  const [period, setPeriod] = useState(1);
  const [picker, setPicker] = useState<{ type: MatchEventType; side: Side } | null>(null);
  const [online, setOnline] = useState(true);

  // Live clock — counts seconds since periodStartedAt.
  // Persists in localStorage so a refresh / tab-close doesn't lose the time.
  const STORAGE = `hamigrash:clock:${matchId}`;
  const [periodStartedAt, setPeriodStartedAt] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(STORAGE);
    if (stored) { const n = +stored; if (Number.isFinite(n)) return n; }
    // Seed from match.started_at if the match is already live.
    return status === 'live' && startedAt ? new Date(startedAt).getTime() : null;
  });

  // Manual minute override (for retroactive event recording).
  const [manualMinute, setManualMinute] = useState<number | null>(null);

  // Tick every second so the visible clock updates.
  const [tickNow, setTickNow] = useState(() => Date.now());
  useEffect(() => {
    if (periodStartedAt == null) return;
    const id = setInterval(() => setTickNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [periodStartedAt]);

  // Computed minute / seconds since the clock started.
  const elapsedSec = periodStartedAt ? Math.max(0, Math.floor((tickNow - periodStartedAt) / 1000)) : 0;
  const liveMinute = manualMinute ?? Math.floor(elapsedSec / 60);
  const liveSecond = elapsedSec % 60;

  useEffect(() => {
    installSyncListeners();
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
    void syncQueue();
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const playersForSide = useMemo(() => (picker?.side === 'home' ? homePlayers : awayPlayers), [picker, homePlayers, awayPlayers]);
  const teamIdForSide = (s: Side) => (s === 'home' ? home.id : away.id);

  function startClock() {
    const now = Date.now();
    setPeriodStartedAt(now);
    localStorage.setItem(STORAGE, String(now));
    setManualMinute(null);
  }

  function pauseClock() {
    setPeriodStartedAt(null);
    localStorage.removeItem(STORAGE);
  }

  function resetClock() {
    setPeriodStartedAt(null);
    localStorage.removeItem(STORAGE);
    setManualMinute(null);
  }

  async function record(type: MatchEventType, side: Side, playerId?: string) {
    const input = {
      client_id: uuid(),
      match_id: matchId,
      team_id: teamIdForSide(side),
      player_id: playerId ?? null,
      event_type: type,
      period,
      minute: liveMinute,
      extra_minute: 0,
      payload: {},
    };
    await enqueueEvent(input);
    void syncQueue();
    setPicker(null);
    router.refresh();
  }

  async function periodControl(action: 'start' | 'end') {
    if (action === 'start') startClock();
    else pauseClock();

    await enqueueEvent({
      client_id: uuid(),
      match_id: matchId,
      team_id: null,
      player_id: null,
      event_type: action === 'start' ? 'period_start' : 'period_end',
      period,
      minute: action === 'start' ? 0 : liveMinute,
      extra_minute: 0,
      payload: {},
    });
    void syncQueue();
    if (action === 'end' && period < numberOfPeriods) setPeriod(p => p + 1);
    router.refresh();
  }

  const isRunning = periodStartedAt != null;
  const overTime = liveMinute > periodLengthMin;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <CardTitle>{he.match.live}</CardTitle>
          <Badge tone={online ? 'success' : 'warning'}>{online ? 'מקוון' : 'לא־מקוון'}</Badge>
        </div>
        <Badge tone="neutral">{he.match.period} {period} / {numberOfPeriods}</Badge>
      </CardHeader>
      <CardBody className="space-y-5">
        {/* Live clock display */}
        <div className="rounded-xl2 bg-ink-900 dark:bg-ink-950 text-white p-5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className={`size-2.5 rounded-full ${isRunning ? 'bg-red-500 live-dot' : 'bg-ink-500'}`} />
            <div>
              <div className="font-display text-4xl font-bold tabular leading-none">
                {String(liveMinute).padStart(2, '0')}<span className="text-ink-400">:</span>{String(liveSecond).padStart(2, '0')}
              </div>
              <div className="text-xs text-ink-400 mt-1">
                {isRunning ? (overTime ? `דקה ${liveMinute} (זמן נוסף)` : `דקה ${liveMinute}`) : 'שעון מושהה'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isRunning ? (
              <button onClick={() => periodControl('start')} className="rounded-xl bg-pitch-600 text-white px-4 h-10 inline-flex items-center gap-2 font-medium hover:bg-pitch-700">
                <Play className="size-4" />התחל מחצית
              </button>
            ) : (
              <button onClick={() => periodControl('end')} className="rounded-xl bg-red-600 text-white px-4 h-10 inline-flex items-center gap-2 font-medium hover:bg-red-700">
                <Square className="size-4" />סיים מחצית
              </button>
            )}
            <button onClick={() => { const v = prompt('דקה ידנית (לתיקון רטרואקטיבי)', String(liveMinute)); if (v != null) { const n = parseInt(v, 10); if (Number.isFinite(n)) setManualMinute(n); } }} className="size-10 rounded-xl bg-ink-700 hover:bg-ink-600 grid place-items-center" aria-label="דקה ידנית">
              <Edit3 className="size-4" />
            </button>
            <button onClick={resetClock} className="size-10 rounded-xl bg-ink-700 hover:bg-ink-600 grid place-items-center" aria-label="איפוס שעון" title="איפוס שעון (לא משפיע על אירועים)">
              <RotateCcw className="size-4" />
            </button>
          </div>
        </div>

        {/* Two-column quick buttons per side */}
        <div className="grid sm:grid-cols-2 gap-4">
          <SideButtons label={home.name} side="home" onPick={(type, side) => setPicker({ type, side })} />
          <SideButtons label={away.name} side="away" onPick={(type, side) => setPicker({ type, side })} />
        </div>

        {/* Player picker modal */}
        {picker && (
          <div className="fixed inset-0 z-40 bg-black/50 dark:bg-black/70 backdrop-blur-sm grid place-items-center p-4" onClick={() => setPicker(null)}>
            <Card className="w-full max-w-md max-h-[80vh] overflow-y-auto">
              <div onClick={e => e.stopPropagation()}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{he.match.events[picker.type]}</CardTitle>
                    <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">דקה {liveMinute} · מחצית {period}</p>
                  </div>
                  <button onClick={() => setPicker(null)} className="text-ink-500 hover:text-ink-900 dark:hover:text-ink-100">✕</button>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {playersForSide.map(p => (
                      <button
                        key={p.id}
                        onClick={() => record(picker.type, picker.side, p.id)}
                        className="rounded-xl border border-ink-100 dark:border-ink-700 p-3 text-sm hover:border-pitch-400 hover:bg-pitch-50 dark:hover:bg-pitch-950 dark:hover:border-pitch-700"
                      >
                        <div className="font-display font-bold text-lg">{p.squad_number ?? '—'}</div>
                        <div className="truncate text-xs text-ink-700 dark:text-ink-200">{p.display_name}</div>
                        <div className="text-[10px] text-ink-400">{p.position}</div>
                      </button>
                    ))}
                  </div>
                  <div className="pt-3">
                    <Button variant="ghost" fullWidth onClick={() => record(picker.type, picker.side)}>ללא שחקן</Button>
                  </div>
                </CardBody>
              </div>
            </Card>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function SideButtons({ label, side, onPick }: { label: string; side: Side; onPick: (t: MatchEventType, s: Side) => void }) {
  return (
    <div className="rounded-xl border border-ink-100 dark:border-ink-700 p-3 bg-white dark:bg-ink-800">
      <div className="font-display font-semibold mb-3 truncate text-ink-900 dark:text-ink-100">{label}</div>
      <div className="grid grid-cols-2 gap-2">
        {QUICK_EVENTS.map(b => (
          <button
            key={b.type}
            onClick={() => onPick(b.type, side)}
            className={`h-12 rounded-xl bg-white dark:bg-ink-800 ring-1 ring-ink-200 dark:ring-ink-700 text-sm font-medium text-ink-900 dark:text-ink-100 active:scale-95 transition-all ${TONE_CLASS[b.tone]}`}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}

'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Sparkles, Info, Trophy } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { he } from '@/lib/i18n/he';
import { balanceTeams, computeOvr, type BalancerPlayer } from '@/lib/algorithms/balancer';
import { cn, ovrColor } from '@/lib/utils';
import { toast } from '@/lib/stores/toast';
import { createTeamsFromBalancer } from '@/lib/actions/balancer';

// Map players-per-team → closest match format.
function suggestFormat(perTeam: number): '5v5' | '6v6' | '7v7' | '8v8' | '9v9' | '10v10' | '11v11' {
  if (perTeam <= 5) return '5v5';
  if (perTeam === 6) return '6v6';
  if (perTeam === 7) return '7v7';
  if (perTeam === 8) return '8v8';
  if (perTeam === 9) return '9v9';
  if (perTeam === 10) return '10v10';
  return '11v11';
}

export function BalancerWorkspace({ players, isAdmin }: { players: BalancerPlayer[]; isAdmin: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [teamCount, setTeamCount] = useState(2);
  const [result, setResult] = useState<{ teams: BalancerPlayer[][]; strengths: number[]; names: string[] } | null>(null);
  const [saveMatch, setSaveMatch] = useState(false);
  const [createComp, setCreateComp] = useState(false);
  const [compName, setCompName] = useState('');
  const [compFormat, setCompFormat] = useState<'5v5'|'6v6'|'7v7'|'8v8'|'9v9'|'10v10'|'11v11'>('11v11');
  const [compRounds, setCompRounds] = useState<1 | 2 | 3 | 4>(1); // 1..4 round-robin legs
  const [genFixtures, setGenFixtures] = useState(true);
  const [compStart, setCompStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [daysBetween, setDaysBetween] = useState(7);
  const [saving, startSave] = useTransition();

  const selectedPlayers = useMemo(() => players.filter(p => selected.has(p.id)), [players, selected]);

  // Division preview: how many per team, and whether it's uneven.
  const divisionInfo = useMemo(() => {
    if (selectedPlayers.length === 0 || teamCount < 2) return null;
    const n = selectedPlayers.length;
    const min = Math.floor(n / teamCount);
    const max = Math.ceil(n / teamCount);
    const remainder = n % teamCount;
    const even = remainder === 0;
    return { min, max, remainder, even, perTeam: n / teamCount };
  }, [selectedPlayers.length, teamCount]);

  function toggle(id: string) {
    setSelected(s => { const next = new Set(s); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  function run() {
    if (selectedPlayers.length < teamCount) { toast.error(`צריך לפחות ${teamCount} שחקנים`); return; }
    try {
      const r = balanceTeams(selectedPlayers, teamCount);
      const defaultNames = Array.from({ length: teamCount }, (_, i) => `קבוצה ${String.fromCharCode(1488 + i)}`);
      setResult({ ...r, names: defaultNames });
      // Pre-fill competition format based on the SMALLEST team — never suggest
      // a format that needs more players than the weakest roster has.
      const minSize = Math.min(...r.teams.map(t => t.length));
      setCompFormat(suggestFormat(minSize));
      if (!compName) setCompName(`ליגה ${new Date().toLocaleDateString('he-IL')}`);
      setTimeout(() => document.getElementById('balancer-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (e: any) {
      console.error(e); toast.error(e.message ?? 'איזון נכשל');
    }
  }

  function swapBetweenTeams(playerId: string, fromTeam: number, toTeam: number) {
    if (!result || fromTeam === toTeam) return;
    const teams = result.teams.map(t => [...t]);
    const idx = teams[fromTeam].findIndex(p => p.id === playerId);
    if (idx === -1) return;
    const [moved] = teams[fromTeam].splice(idx, 1);
    teams[toTeam].push(moved);
    const strengths = teams.map(t => t.reduce((s, p) => s + computeOvr(p), 0));
    setResult({ ...result, teams, strengths });
  }

  function setTeamName(i: number, name: string) {
    if (!result) return;
    const names = [...result.names];
    names[i] = name;
    setResult({ ...result, names });
  }

  function save() {
    if (!result) return;
    if (!isAdmin) { toast.error('רק admin יכול ליצור קבוצות'); return; }
    if (result.names.some(n => !n.trim())) { toast.error('כל הקבוצות צריכות שם'); return; }
    if (createComp && !compName.trim()) { toast.error('יש להזין שם לתחרות'); return; }
    startSave(async () => {
      try {
        const sides = result.teams.map((team, i) => ({ name: result.names[i].trim(), player_ids: team.map(p => p.id) }));
        const res = await createTeamsFromBalancer(sides, {
          createMatch: saveMatch && !createComp,
          competition: createComp ? {
            name: compName.trim(),
            format: compFormat,
            generateFixtures: genFixtures,
            startsOn: compStart,
            daysBetweenRounds: daysBetween,
            rounds: compRounds,
          } : null,
        });
        if (res.competitionId) {
          toast.success(`${res.teams.length} קבוצות נוצרו + תחרות${genFixtures ? ' + לוח משחקים' : ''}`);
          router.push(`/competitions/${res.competitionId}`);
        } else if (res.matchId) {
          toast.success(`${res.teams.length} קבוצות נוצרו + משחק`);
          router.push(`/matches/${res.matchId}`);
        } else {
          toast.success(`${res.teams.length} קבוצות נוצרו`);
          router.push('/teams');
        }
      } catch (e: any) {
        toast.error(e.message ?? 'יצירה נכשלה');
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-ink-50">{he.balancer.title}</h1>
        <p className="text-sm text-ink-500 dark:text-ink-400 mt-0.5">{he.balancer.subtitle}</p>
      </div>

      <Card>
        <CardBody className="space-y-3">
          <div className="flex items-end gap-3 flex-wrap">
            <Input type="number" min={2} max={10} label={he.balancer.teamCount} value={teamCount} onChange={e => setTeamCount(+e.target.value)} className="w-32" />
            <div className="text-sm text-ink-600 dark:text-ink-300 self-end pb-3">נבחרו {selectedPlayers.length} מתוך {players.length}</div>
            <div className="flex-1" />
            <Button variant="secondary" onClick={() => setSelected(new Set(players.map(p => p.id)))} disabled={players.length === 0}>בחר הכל</Button>
            <Button variant="ghost" onClick={() => { setSelected(new Set()); setResult(null); }} disabled={selected.size === 0}>נקה</Button>
            <Button onClick={run} disabled={selectedPlayers.length < teamCount} className="gap-2">
              <Sparkles className="size-4" />{he.balancer.run}
            </Button>
          </div>

          {divisionInfo && (
            divisionInfo.even ? (
              <div className="rounded-lg bg-pitch-50 dark:bg-pitch-950/40 border border-pitch-200 dark:border-pitch-800 px-3 py-2 text-sm text-pitch-900 dark:text-pitch-200 flex items-center gap-2">
                <Info className="size-4 shrink-0" />
                חלוקה שווה: {divisionInfo.min} שחקנים לכל קבוצה ({divisionInfo.min}v{divisionInfo.min})
              </div>
            ) : (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <Info className="size-4 shrink-0" />
                חלוקה לא שווה: {divisionInfo.remainder} קבוצות יקבלו {divisionInfo.max} שחקנים, {teamCount - divisionInfo.remainder} יקבלו {divisionInfo.min}.
                שקול לבחור {divisionInfo.min * teamCount} שחקנים, או לפצל ל־{divisionInfo.max}/{divisionInfo.min} קבוצות.
              </div>
            )
          )}
        </CardBody>
      </Card>

      {/* Selection grid */}
      <Card>
        <CardHeader><CardTitle>{he.balancer.selectPlayers}</CardTitle></CardHeader>
        <CardBody>
          {players.length === 0 ? (
            <p className="text-sm text-ink-500 dark:text-ink-400">אין שחקנים זמינים. צור שחקנים תחילה.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {players.map(p => {
                const ovr = computeOvr(p);
                const isSel = selected.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    className={cn(
                      'rounded-xl border-2 p-3 text-start transition-colors',
                      isSel
                        ? 'border-pitch-500 bg-pitch-50 dark:bg-pitch-950 dark:border-pitch-400'
                        : 'border-ink-100 hover:border-ink-300 dark:border-ink-700 dark:hover:border-ink-500 bg-white dark:bg-ink-800',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className={cn('size-9 rounded-lg grid place-items-center font-display font-bold text-sm tabular', ovrColor(ovr))}>{ovr}</div>
                      <Badge tone="neutral">{he.player.positions[p.position]}</Badge>
                    </div>
                    <div className="mt-2 font-medium text-sm truncate text-ink-900 dark:text-ink-100">{p.display_name}</div>
                    {p.training_group?.name && (
                      <div className="mt-1 text-[10px] text-ink-500 dark:text-ink-400 truncate">📅 {p.training_group.name}</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Result */}
      {result && (
        <div id="balancer-result" className="space-y-4">
          <div className={`grid gap-4 ${result.teams.length === 2 ? 'lg:grid-cols-2' : result.teams.length <= 4 ? 'md:grid-cols-2 lg:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
            {result.teams.map((team, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <Input
                    value={result.names[i]}
                    onChange={e => setTeamName(i, e.target.value)}
                    className="font-display font-semibold !h-10"
                    placeholder={`שם קבוצה ${String.fromCharCode(1488 + i)}`}
                  />
                  <Badge tone="pitch">{result.strengths[i]}</Badge>
                </CardHeader>
                <CardBody>
                  <ul className="space-y-2">
                    {team.map(p => (
                      <li key={p.id} className="flex items-center gap-3">
                        <span className={cn('size-8 rounded-lg grid place-items-center text-xs font-bold tabular', ovrColor(computeOvr(p)))}>{computeOvr(p)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="truncate text-ink-900 dark:text-ink-100">{p.display_name}</div>
                          {p.training_group?.name && (
                            <div className="text-[10px] text-ink-500 dark:text-ink-400 truncate">📅 {p.training_group.name}</div>
                          )}
                        </div>
                        <Badge tone="neutral">{he.player.positions[p.position]}</Badge>
                        <select
                          className="text-xs rounded-md border border-ink-200 dark:border-ink-700 dark:bg-ink-800 px-2 py-1"
                          value={i}
                          onChange={e => swapBetweenTeams(p.id, i, +e.target.value)}
                          title={he.balancer.override}
                        >
                          {result.teams.map((_, j) => <option key={j} value={j}>{result.names[j] || String.fromCharCode(1488 + j)}</option>)}
                        </select>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            ))}
          </div>

          {/* Save bar */}
          {isAdmin && (
            <Card>
              <CardBody className="space-y-4">
                <div>
                  <div className="font-display font-semibold text-ink-900 dark:text-ink-100">שמירה כקבוצות אמיתיות</div>
                  <p className="text-sm text-ink-500 dark:text-ink-400">ייווצרו {result.teams.length} קבוצות חדשות. השחקנים יועברו אליהן (יוצאים מהפול המקורי).</p>
                </div>

                {/* Friendly match option (only for 2 teams) */}
                {result.teams.length === 2 && !createComp && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={saveMatch} onChange={e => setSaveMatch(e.target.checked)} className="rounded" />
                    <span>צור גם משחק ידידות בין שתי הקבוצות</span>
                  </label>
                )}

                {/* Competition option (for 2+ teams) */}
                <div className="rounded-xl bg-ink-50 dark:bg-ink-700/40 p-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={createComp} onChange={e => { setCreateComp(e.target.checked); if (e.target.checked) setSaveMatch(false); }} className="rounded" />
                    <Trophy className="size-4 text-amber-500" />
                    <span className="font-medium">צור גם תחרות (ליגה) עם {result.teams.length} הקבוצות</span>
                  </label>
                  {createComp && (() => {
                    const n = result.teams.length;
                    const matchdaysPerRound = n % 2 === 0 ? n - 1 : n;
                    const gamesPerMatchday = Math.floor(n / 2);
                    const totalMatchdays = matchdaysPerRound * compRounds;
                    const totalGames = gamesPerMatchday * matchdaysPerRound * compRounds;
                    return (
                      <div className="mt-3 space-y-3">
                        <Input label="שם התחרות" value={compName} onChange={e => setCompName(e.target.value)} placeholder="לדוגמה: ליגת ערב 2026" />

                        {/* Rounds (1–4 legs) */}
                        <div>
                          <div className="text-sm font-medium text-ink-800 dark:text-ink-200 mb-2">מספר סיבובים</div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {([
                              { v: 1, title: 'יחיד', desc: 'כל זוג פעם' },
                              { v: 2, title: 'כפול', desc: 'בית + חוץ' },
                              { v: 3, title: '3', desc: '3 פעמים' },
                              { v: 4, title: '4', desc: '4 פעמים' },
                            ] as const).map(opt => (
                              <button
                                key={opt.v}
                                type="button"
                                onClick={() => setCompRounds(opt.v)}
                                className={cn(
                                  'rounded-xl border-2 p-2.5 text-start transition-colors',
                                  compRounds === opt.v
                                    ? 'border-pitch-500 bg-pitch-50 dark:bg-pitch-950 dark:border-pitch-400'
                                    : 'border-ink-100 hover:border-ink-300 dark:border-ink-700 dark:hover:border-ink-500',
                                )}
                              >
                                <div className="font-semibold text-sm text-ink-900 dark:text-ink-50">{opt.title}</div>
                                <div className="text-[11px] text-ink-500 dark:text-ink-400">{opt.desc}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-3">
                          <Input type="date" label="תחילת התחרות" value={compStart} onChange={e => setCompStart(e.target.value)} hint="מהתאריך הזה ייפרסו המשחקים" />
                          <Input type="number" min={1} max={30} label="ימים בין מחזורים" value={daysBetween} onChange={e => setDaysBetween(+e.target.value || 7)} hint="לדוגמה 7 = מחזור בכל שבוע" />
                        </div>

                        <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={genFixtures} onChange={e => setGenFixtures(e.target.checked)} className="rounded" />
                          <span>גם ייצור לוח משחקים אוטומטי</span>
                        </label>

                        {genFixtures && (
                          <p className="text-xs text-ink-500 dark:text-ink-400">
                            {n} קבוצות · <strong>{totalMatchdays}</strong> מחזורים · <strong>{totalGames}</strong> משחקים ·
                            {' '}סיום בערך ב־{new Date(new Date(compStart).getTime() + (totalMatchdays - 1) * daysBetween * 86400000).toLocaleDateString('he-IL')}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="flex justify-end">
                  <Button onClick={save} loading={saving} className="gap-2">
                    <Save className="size-4" />
                    {createComp ? `צור קבוצות + תחרות${genFixtures ? ' + לוח' : ''}` :
                     (result.teams.length === 2 && saveMatch) ? 'צור קבוצות + משחק' :
                     'צור קבוצות'}
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}
          {!isAdmin && (
            <Card>
              <CardBody className="text-sm text-ink-500 dark:text-ink-400">רק admin יכול לשמור את התוצאה כקבוצות חדשות.</CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

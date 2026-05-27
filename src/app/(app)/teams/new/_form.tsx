'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, MapPin, Palette, Shapes, Type, Link as LinkIcon } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TeamBadge } from '@/components/team/team-badge';
import { he } from '@/lib/i18n/he';
import { slugify, cn, contrastText } from '@/lib/utils';
import { toast } from '@/lib/stores/toast';
import { createTeam, updateTeam } from '@/lib/actions/teams';
import { teamCreateSchema } from '@/lib/schemas';
import { useFormErrors } from '@/hooks/use-form-errors';
import type { CrestShape } from '@/lib/supabase/database.types';

export type TeamFormInitial = {
  id?: string;
  name?: string;
  slug?: string;
  short_name?: string | null;
  home_venue?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  crest_url?: string | null;
  crest_shape?: CrestShape | null;
  crest_text_color?: string | null;
};

const PRESET_COLORS = [
  '#16a34a', '#dc2626', '#1d4ed8', '#fbbf24', '#0a0a0a',
  '#ffffff', '#9333ea', '#0e7490', '#ea580c', '#475569',
];

const SHAPES: { key: CrestShape; label: string }[] = [
  { key: 'hexagon',  label: 'משושה' },
  { key: 'shield',   label: 'מגן' },
  { key: 'circle',   label: 'עיגול' },
  { key: 'square',   label: 'ריבוע' },
  { key: 'diamond',  label: 'יהלום' },
  { key: 'pentagon', label: 'חמשה' },
];

export function TeamForm({ initial }: { initial?: TeamFormInitial }) {
  const router = useRouter();
  const editing = !!initial?.id;
  const [submitting, setSubmitting] = useState(false);
  const { errors, validate, clear } = useFormErrors();
  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [shortName, setShortName] = useState(initial?.short_name ?? '');
  const [venue, setVenue] = useState(initial?.home_venue ?? '');
  const [primary, setPrimary] = useState(initial?.primary_color ?? '#16a34a');
  const [secondary, setSecondary] = useState(initial?.secondary_color ?? '#0f172a');
  const [shape, setShape] = useState<CrestShape>(initial?.crest_shape ?? 'hexagon');
  const [textColorAuto, setTextColorAuto] = useState(initial?.crest_text_color == null);
  const [textColor, setTextColor] = useState(initial?.crest_text_color ?? '#ffffff');

  const effectiveTextColor = textColorAuto ? contrastText(primary) : textColor;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name,
      slug: slug || slugify(name),
      short_name: shortName || undefined,
      home_venue: venue || undefined,
      primary_color: primary,
      secondary_color: secondary,
      crest_shape: shape,
      crest_text_color: textColorAuto ? null : textColor,
    };
    const parsed = validate(teamCreateSchema, payload);
    if (!parsed) { toast.error('יש לתקן את השדות המסומנים'); return; }
    setSubmitting(true);
    try {
      if (editing) {
        await updateTeam(initial!.id!, parsed);
        toast.success('הקבוצה עודכנה');
        router.push(`/teams/${initial!.id}`);
      } else {
        const team = await createTeam(parsed);
        toast.success('הקבוצה נוצרה');
        router.push(`/teams/${team.id}`);
      }
    } catch (err: any) {
      toast.error(err.message ?? 'הפעולה נכשלה');
      setSubmitting(false);
    }
  }

  const previewTeam = {
    name: name || 'שם הקבוצה',
    short_name: shortName || (name ? name.slice(0, 2) : 'XX'),
    primary_color: primary,
    crest_shape: shape,
    crest_text_color: effectiveTextColor,
  };

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-ink-50">
          {editing ? `עריכת קבוצה${initial?.name ? ` — ${initial.name}` : ''}` : he.team.create}
        </h1>
        <p className="text-sm text-ink-500 dark:text-ink-400 mt-0.5">תצוגה מקדימה מתעדכנת בזמן אמת.</p>
      </header>

      <form onSubmit={submit} noValidate className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6 min-w-0">
          {/* Identity */}
          <Card>
            <CardBody className="space-y-4">
              <SectionTitle icon={ShieldCheck} title="זהות" subtitle="שם וכתובת ייחודית" />
              <Input label={he.team.name} value={name} onChange={e => { setName(e.target.value); clear('name'); if (!editing && !slug) setSlug(slugify(e.target.value)); }} placeholder="לדוגמה: מכבי תל אביב" error={errors.name} />
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label={he.team.shortName} value={shortName ?? ''} onChange={e => { setShortName(e.target.value); clear('short_name'); }} maxLength={3} placeholder='לדוגמה: מ"ת' hint="עד 3 תווים שיופיעו על הסמל" error={errors.short_name} />
                <Input label={he.team.slug} value={slug} onChange={e => { setSlug(e.target.value); clear('slug'); }} placeholder="maccabi-tel-aviv" disabled={editing} hint={editing ? 'לא ניתן לשנות' : 'אותיות, ספרות ומקפים בלבד'} error={errors.slug} />
              </div>
            </CardBody>
          </Card>

          {/* Crest shape */}
          <Card>
            <CardBody className="space-y-4">
              <SectionTitle icon={Shapes} title="צורת הסמל" subtitle="הצורה שתעטוף את ראשי התיבות" />
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {SHAPES.map(s => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setShape(s.key)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition-all',
                      shape === s.key
                        ? 'border-pitch-500 bg-pitch-50 dark:bg-pitch-950'
                        : 'border-ink-100 hover:border-ink-300 dark:border-ink-700 dark:hover:border-ink-500',
                    )}
                  >
                    <TeamBadge team={{ ...previewTeam, crest_shape: s.key }} size="md" />
                    <span className="text-xs font-medium text-ink-700 dark:text-ink-200">{s.label}</span>
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Colors */}
          <Card>
            <CardBody className="space-y-5">
              <SectionTitle icon={Palette} title="צבעי הקבוצה" subtitle="צבע ראשי, משני וטקסט" />

              <ColorRow label="צבע ראשי (רקע הסמל)" value={primary} onChange={setPrimary} />
              <ColorRow label={he.team.secondaryColor} value={secondary} onChange={setSecondary} />

              {/* Text colour */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-ink-800 dark:text-ink-200 inline-flex items-center gap-2">
                    <Type className="size-4" /> צבע טקסט בסמל
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" checked={textColorAuto} onChange={e => setTextColorAuto(e.target.checked)} className="rounded" />
                    <span className="text-ink-600 dark:text-ink-300">אוטומטי (ניגוד)</span>
                  </label>
                </div>
                {!textColorAuto && <ColorPalette value={textColor} onChange={setTextColor} />}
                {textColorAuto && (
                  <p className="text-xs text-ink-500 dark:text-ink-400">
                    יחושב אוטומטית: {effectiveTextColor === '#ffffff' ? 'לבן' : 'שחור'} (לפי בהירות הרקע)
                  </p>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Venue */}
          <Card>
            <CardBody className="space-y-4">
              <SectionTitle icon={MapPin} title="מגרש ביתי" />
              <Input label={he.team.venue} value={venue ?? ''} onChange={e => { setVenue(e.target.value); clear('home_venue'); }} placeholder="לדוגמה: אצטדיון בלומפילד" error={errors.home_venue} />
            </CardBody>
          </Card>

          <div className="flex gap-2">
            <Button type="submit" loading={submitting}>{editing ? he.common.save : he.common.create}</Button>
            <Button variant="ghost" type="button" onClick={() => router.back()}>{he.common.cancel}</Button>
          </div>
        </div>

        {/* Live preview */}
        <aside className="lg:sticky lg:top-24 h-fit">
          <Card>
            <CardBody className="space-y-5">
              <div className="text-xs font-medium text-ink-500 dark:text-ink-400 uppercase tracking-wide">תצוגה מקדימה</div>

              <div className="rounded-xl2 p-8 grid place-items-center" style={{ background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)` }}>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3">
                  <TeamBadge team={previewTeam} size="xl" />
                </div>
              </div>

              <div className="rounded-xl border border-ink-100 dark:border-ink-700 p-3 flex items-center gap-3">
                <TeamBadge team={previewTeam} size="md" />
                <div className="min-w-0">
                  <div className="font-display font-semibold truncate text-ink-900 dark:text-ink-100">{previewTeam.name}</div>
                  {venue && <div className="text-xs text-ink-500 dark:text-ink-400 truncate flex items-center gap-1"><MapPin className="size-3" />{venue}</div>}
                </div>
              </div>

              {!editing && slug && (
                <div className="rounded-lg bg-ink-50 dark:bg-ink-700/50 p-3 text-xs">
                  <div className="text-ink-500 dark:text-ink-400 mb-1 flex items-center gap-1"><LinkIcon className="size-3" />URL ציבורי</div>
                  <code className="text-ink-700 dark:text-ink-200 tabular break-all" dir="ltr">/t/{slug}</code>
                </div>
              )}

              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-900 dark:text-amber-200">
                העלאת קובץ סמל תיתמך בעתיד.
              </div>
            </CardBody>
          </Card>
        </aside>
      </form>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3 pb-1">
      <div className="size-9 rounded-lg bg-pitch-100 dark:bg-pitch-950 text-pitch-700 dark:text-pitch-300 grid place-items-center shrink-0">
        <Icon className="size-5" />
      </div>
      <div>
        <div className="font-display font-semibold text-ink-900 dark:text-ink-50">{title}</div>
        {subtitle && <div className="text-xs text-ink-500 dark:text-ink-400">{subtitle}</div>}
      </div>
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block mb-2 text-sm font-medium text-ink-800 dark:text-ink-200">{label}</label>
      <ColorPalette value={value} onChange={onChange} />
    </div>
  );
}

function ColorPalette({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESET_COLORS.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            'size-9 rounded-lg ring-2 ring-offset-2 ring-offset-white dark:ring-offset-ink-800 transition-transform',
            value.toLowerCase() === c.toLowerCase() ? 'ring-pitch-600 scale-110' : 'ring-ink-200 dark:ring-ink-700 hover:scale-105',
          )}
          style={{ background: c }}
          aria-label={`צבע ${c}`}
        />
      ))}
      <div className="relative size-9 rounded-lg overflow-hidden ring-2 ring-ink-200 dark:ring-ink-700">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="absolute inset-0 size-12 cursor-pointer border-0 p-0" />
      </div>
      <code className="text-xs text-ink-500 dark:text-ink-400 tabular ms-2" dir="ltr">{value}</code>
    </div>
  );
}

export function NewTeamForm() { return <TeamForm />; }

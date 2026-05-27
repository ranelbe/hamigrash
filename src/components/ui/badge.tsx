import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'live' | 'success' | 'warning' | 'danger' | 'pitch';

const TONES: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-800 dark:bg-ink-700 dark:text-ink-200',
  live:    'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  danger:  'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200',
  pitch:   'bg-pitch-100 text-pitch-700 dark:bg-pitch-950 dark:text-pitch-200',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', TONES[tone], className)}>
      {tone === 'live' && <span className="size-1.5 rounded-full bg-red-600 live-dot" />}
      {children}
    </span>
  );
}

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9֐-׿\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  // Schema requires at least 2 chars; append random suffix if too short.
  if (slug.length < 2) return `x-${Math.random().toString(36).slice(2, 8)}`;
  return slug;
}

export function formatHebrewDate(input: string | Date | null | undefined): string {
  if (!input) return '';
  const d = typeof input === 'string' ? new Date(input) : input;
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatHebrewTime(input: string | Date | null | undefined): string {
  if (!input) return '';
  const d = typeof input === 'string' ? new Date(input) : input;
  return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

export function formatScore(home: number, away: number) {
  // RTL-safe; pure digits + colon don't reorder.
  return `${home} - ${away}`;
}

// Number of players each side needs to field for a given format ('7v7' → 7).
export function formatRequiredPlayers(format?: string | null): number {
  if (!format) return 11;
  const m = format.match(/^(\d+)v\d+$/);
  return m ? parseInt(m[1], 10) : 11;
}

// Choose readable text color (black or white) over an arbitrary hex bg.
// Uses relative luminance per WCAG. Avoids the "white text on yellow team kit" problem.
export function contrastText(hex?: string | null): string {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return '#ffffff';
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.45 ? '#0f172a' : '#ffffff';
}

export function ovrColor(ovr: number) {
  if (ovr >= 85) return 'bg-yellow-400 text-yellow-900';
  if (ovr >= 75) return 'bg-emerald-400 text-emerald-950';
  if (ovr >= 65) return 'bg-sky-400 text-sky-950';
  if (ovr >= 50) return 'bg-slate-300 text-slate-900';
  return 'bg-slate-200 text-slate-700';
}

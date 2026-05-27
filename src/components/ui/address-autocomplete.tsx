'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';

/**
 * Searchable dropdown for data.gov.il-backed address fields.
 *
 * Architecture: the API returns the FULL list once (cached 24h
 * server-side); the component caches it in memory and filters locally
 * on every keystroke. We don't rely on CKAN's `q` full-text search
 * because it handles Hebrew partial matches poorly.
 *
 * The `cacheKey` prop controls when to discard the cache and refetch
 * (e.g. when the chosen city changes for the street picker).
 */
export function AddressAutocomplete({
  label,
  hint,
  value,
  onChange,
  fetchUrl,
  cacheKey,
  disabled,
  error,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (next: string) => void;
  /** Returns the URL whose `results` array is the full option list. */
  fetchUrl: () => string | null;
  /** Refetch when this changes (e.g. city for streets). */
  cacheKey: string;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset cache when the data-source key changes (e.g. selected city).
  useEffect(() => {
    setOptions([]);
    setHasFetched(false);
  }, [cacheKey]);

  // Lazy-fetch the full list on first open.
  useEffect(() => {
    if (!open || hasFetched || disabled) return;
    const url = fetchUrl();
    if (!url) return;
    setLoading(true);
    const ctrl = new AbortController();
    (async () => {
      try {
        const r = await fetch(url, { signal: ctrl.signal });
        const j = await r.json();
        setOptions(j.results ?? []);
        setHasFetched(true);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [open, hasFetched, disabled, fetchUrl]);

  // Click-outside closes the popover.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Local filtering — case/whitespace insensitive substring match.
  const visible = useMemo(() => {
    if (!value) return options;
    const needle = value.trim().toLowerCase();
    return options.filter(o => o.toLowerCase().includes(needle));
  }, [options, value]);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          label={label}
          hint={hint}
          error={error}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          autoComplete="off"
        />
        <ChevronDown
          aria-hidden
          className={`pointer-events-none absolute left-3 top-[2.35rem] size-4 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </div>
      {open && !disabled && (
        <div className="absolute z-30 top-full mt-1 inset-x-0 rounded-xl bg-white ring-1 ring-ink-200 shadow-cardLg max-h-80 overflow-auto">
          {loading && !hasFetched ? (
            <div className="p-3 text-xs text-ink-500">טוען...</div>
          ) : visible.length === 0 ? (
            <div className="p-3 text-xs text-ink-500">
              {hasFetched ? 'לא נמצאו התאמות — אפשר להזין ידנית' : 'אין נתונים'}
            </div>
          ) : (
            <ul className="py-1">
              {visible.map(r => (
                <li key={r}>
                  <button
                    type="button"
                    onMouseDown={e => { e.preventDefault(); onChange(r); setOpen(false); }}
                    className={`block w-full text-start px-3 py-1.5 text-sm hover:bg-pitch-50 hover:text-pitch-900 ${r === value ? 'bg-pitch-50 text-pitch-900 font-medium' : ''}`}
                  >
                    {r}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

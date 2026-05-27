'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';

/**
 * Address autocomplete backed by data.gov.il proxy endpoints.
 * Type-ahead with debounce. Free-text fallback allowed if the user
 * doesn't pick a suggestion — we don't want to lock people out of
 * editing their own data if data.gov.il is down.
 */
export function AddressAutocomplete({
  label,
  hint,
  value,
  onChange,
  fetchUrl,
  disabled,
  error,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (next: string) => void;
  /** Builds the URL given the current query string. e.g. q => `/api/data-gov/cities?q=${q}` */
  fetchUrl: (query: string) => string | null;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced fetch
  useEffect(() => {
    if (disabled) { setResults([]); return; }
    if (!value || value.length < 1) { setResults([]); return; }
    const url = fetchUrl(value);
    if (!url) { setResults([]); return; }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(url, { signal: ctrl.signal });
        const j = await r.json();
        setResults(j.results ?? []);
      } catch { /* ignore aborts */ } finally {
        setLoading(false);
      }
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [value, disabled, fetchUrl]);

  // Click-outside closes the popover
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
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
      {open && value && results.length > 0 && (
        <ul className="absolute z-30 top-full mt-1 inset-x-0 max-h-56 overflow-auto rounded-xl bg-white ring-1 ring-ink-200 shadow-cardLg py-1">
          {results.map(r => (
            <li key={r}>
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); onChange(r); setOpen(false); }}
                className="block w-full text-start px-3 py-1.5 text-sm hover:bg-pitch-50 hover:text-pitch-900"
              >
                {r}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && value && !loading && results.length === 0 && (
        <div className="absolute z-30 top-full mt-1 inset-x-0 rounded-xl bg-white ring-1 ring-ink-200 shadow-cardLg p-3 text-xs text-ink-500">
          לא נמצאו התאמות — אפשר להזין ידנית
        </div>
      )}
    </div>
  );
}

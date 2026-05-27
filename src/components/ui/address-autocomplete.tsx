'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';

/**
 * Searchable dropdown for data.gov.il-backed address fields.
 *
 * UX: focusing the field immediately opens the popover and fetches a
 * default list (no typing required), so it behaves like a real dropdown.
 * Typing narrows the list via the API's full-text search. Picking an
 * option closes the popover. Free-text remains allowed in case
 * data.gov.il is down or the locality isn't in the dataset.
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
  /**
   * Builds the URL for a given query string.
   * Called with '' on focus (so the field can show defaults), and with
   * the typed text on every change.
   * Return null to disable fetching (e.g. street picker before city set).
   */
  fetchUrl: (query: string) => string | null;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasFetchedInitial, setHasFetchedInitial] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch whenever value changes OR when popover first opens.
  useEffect(() => {
    if (disabled || !open) return;
    const url = fetchUrl(value);
    if (!url) { setResults([]); return; }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(url, { signal: ctrl.signal });
        const j = await r.json();
        setResults(j.results ?? []);
        setHasFetchedInitial(true);
      } catch { /* ignore aborts */ } finally {
        setLoading(false);
      }
    }, value ? 250 : 0); // no debounce on initial empty-value open
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [value, disabled, open, fetchUrl]);

  // Click-outside closes the popover
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // If the parent changes the city (which clears value), close + reset.
  useEffect(() => { if (!value) setHasFetchedInitial(false); }, [value]);

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
      {open && !disabled && results.length > 0 && (
        <ul className="absolute z-30 top-full mt-1 inset-x-0 max-h-80 overflow-auto rounded-xl bg-white ring-1 ring-ink-200 shadow-cardLg py-1">
          {results.map(r => (
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
      {open && !disabled && hasFetchedInitial && !loading && results.length === 0 && (
        <div className="absolute z-30 top-full mt-1 inset-x-0 rounded-xl bg-white ring-1 ring-ink-200 shadow-cardLg p-3 text-xs text-ink-500">
          לא נמצאו התאמות — אפשר להזין ידנית
        </div>
      )}
      {open && !disabled && loading && !hasFetchedInitial && (
        <div className="absolute z-30 top-full mt-1 inset-x-0 rounded-xl bg-white ring-1 ring-ink-200 shadow-cardLg p-3 text-xs text-ink-500">
          טוען...
        </div>
      )}
    </div>
  );
}

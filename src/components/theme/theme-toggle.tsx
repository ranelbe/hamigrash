'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

const STORAGE_KEY = 'hamigrash:theme';

/**
 * Light/dark toggle. State lives on <html class="dark">, persisted to
 * localStorage. The init script in app/layout.tsx applies the saved
 * preference before first paint, so this component's only job is to
 * mutate it on click and stay in sync.
 */
export function ThemeToggle() {
  // We can't read <html class> on the server (always undefined there)
  // — keep `mounted` so we don't render until we know the real state.
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    setMounted(true);
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(STORAGE_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(STORAGE_KEY, 'light');
    }
  }

  // SSR-safe placeholder so layout doesn't shift after hydration.
  if (!mounted) {
    return <div className="size-10 rounded-xl" aria-hidden />;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'מעבר למצב יום' : 'מעבר למצב לילה'}
      title={isDark ? 'מצב יום' : 'מצב לילה'}
      className="size-10 rounded-xl grid place-items-center text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800 transition-colors"
    >
      {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}

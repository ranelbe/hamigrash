'use client';

import { Sun, Moon } from 'lucide-react';

const STORAGE_KEY = 'hamigrash:theme';

/**
 * Light/dark toggle.
 *
 * State lives on <html class="dark"> + localStorage. The init script in
 * app/layout.tsx applies the saved preference before first paint so
 * there is no flash.
 *
 * Rendering trick to avoid SSR/CSR hydration mismatch:
 *   • Both icons are always rendered in the DOM.
 *   • `dark:hidden` / `hidden dark:block` use Tailwind's `darkMode: 'class'`
 *     so only the icon matching the current <html.dark> state is visible.
 *   • Therefore the server and the client render the exact same HTML,
 *     and the user sees the correct icon immediately after the init
 *     script runs — no JS needed for the initial paint.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const goingDark = !root.classList.contains('dark');
    root.classList.toggle('dark', goingDark);
    try { localStorage.setItem(STORAGE_KEY, goingDark ? 'dark' : 'light'); } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="החלפת מצב יום/לילה"
      title="החלפת מצב יום/לילה"
      className="size-10 rounded-xl grid place-items-center text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800 transition-colors"
    >
      <Moon className="size-5 dark:hidden" aria-hidden />
      <Sun  className="size-5 hidden dark:block" aria-hidden />
    </button>
  );
}

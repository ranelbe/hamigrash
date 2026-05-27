import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  // The ThemeToggle component (src/components/theme/theme-toggle.tsx)
  // adds/removes `dark` on <html>. An inline <head> script in
  // src/app/layout.tsx applies the saved preference before first
  // paint to avoid a flash.
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-heebo)', 'system-ui', 'sans-serif'],
        display: ['var(--font-rubik)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Green accent ("pitch") — full Tailwind green scale so every
        // dark:bg-pitch-* / dark:text-pitch-* utility resolves.
        pitch: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        // Neutral ("ink") — full Tailwind slate scale. Used for all
        // backgrounds and text. Pairings to keep contrast safe:
        //   light mode: bg-white / bg-ink-50 + text-ink-900
        //   dark mode:  bg-ink-900 / bg-ink-800 + text-ink-50 / text-ink-100
        //   secondary: text-ink-500 on bg-ink-50 / text-ink-400 on bg-ink-800
        ink: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      boxShadow: {
        card:   '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
        cardLg: '0 10px 30px -10px rgba(15, 23, 42, 0.18)',
      },
      borderRadius: { xl2: '1.25rem' },
    },
  },
  plugins: [],
};

export default config;

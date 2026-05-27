import type { Metadata, Viewport } from 'next';
import { Heebo, Rubik } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { he } from '@/lib/i18n/he';

const heebo = Heebo({ subsets: ['hebrew', 'latin'], variable: '--font-heebo', display: 'swap' });
const rubik = Rubik({ subsets: ['hebrew', 'latin'], variable: '--font-rubik', display: 'swap' });

export const metadata: Metadata = {
  title: { default: `${he.app.name} — ${he.app.tagline}`, template: `%s · ${he.app.name}` },
  description: he.app.tagline,
  applicationName: he.app.name,
};

export const viewport: Viewport = {
  themeColor: '#16a34a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

// Applies the chosen theme to <html> BEFORE first paint to avoid the
// classic "flash of light theme then dark" on full reloads.
//   1. saved preference wins → 'dark' | 'light'
//   2. otherwise follow the OS's prefers-color-scheme
const themeInitScript = `
(function() {
  try {
    var saved = localStorage.getItem('hamigrash:theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var useDark = saved ? (saved === 'dark') : prefersDark;
    if (useDark) document.documentElement.classList.add('dark');
  } catch (e) { /* no localStorage in some browsing modes — fine */ }
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} ${rubik.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} ${rubik.variable}`}>
      <head>
        {/* Make sure dark mode is never active even if the class was set by an earlier dev build. */}
        <script dangerouslySetInnerHTML={{ __html: `try{document.documentElement.classList.remove('dark');localStorage.removeItem('hamigrash:theme');}catch(e){}` }} />
      </head>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

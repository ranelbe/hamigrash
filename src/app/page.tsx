import Link from 'next/link';
import { he } from '@/lib/i18n/he';
import { ThemeToggle } from '@/components/theme/theme-toggle';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-pitch-50 dark:from-[#0b1220] dark:to-[#0e1a2e] text-ink-900 dark:text-ink-100">
      <header className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="size-9 rounded-lg bg-pitch-600 text-white grid place-items-center">⚽</span>
          {he.app.name}
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="rounded-xl bg-pitch-600 text-white px-4 h-10 inline-flex items-center font-medium hover:bg-pitch-700">
            {he.nav.login}
          </Link>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-6 pt-16 pb-24 text-center">
        <span className="inline-block rounded-full bg-pitch-100 dark:bg-pitch-950 text-pitch-700 dark:text-pitch-300 px-3 py-1 text-xs font-medium">בטא ציבורית • עברית מלאה</span>
        <h1 className="mt-6 font-display text-4xl md:text-6xl font-bold tracking-tight text-ink-900 dark:text-ink-50">
          ניהול ליגות חובבים — <span className="text-pitch-600 dark:text-pitch-400">פשוט, מהיר, חינמי</span>
        </h1>
        <p className="mt-5 text-lg text-ink-600 dark:text-ink-300 leading-relaxed">
          קבוצות, סגלים, משחקים, טבלת ליגה ומלכי שערים — הכל מתעדכן אוטומטית מאירועי המשחק.
          בלי גליונות, בלי בלגן.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/login" className="rounded-xl bg-pitch-600 text-white px-6 h-12 inline-flex items-center font-medium hover:bg-pitch-700">
            {he.auth.google}
          </Link>
          <a href="#features" className="rounded-xl bg-white dark:bg-ink-800 ring-1 ring-ink-200 dark:ring-ink-700 text-ink-900 dark:text-ink-100 px-6 h-12 inline-flex items-center font-medium hover:bg-ink-50 dark:hover:bg-ink-700">
            איך זה עובד
          </a>
        </div>
      </section>

      <section id="features" className="max-w-5xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-4">
        {[
          { title: 'מקור אמת יחיד', body: 'כל הנתונים — טבלת ליגה, סטטיסטיקות שחקנים, מלכי שערים — נגזרים מאירועי המשחק. בלי עריכה ידנית.' },
          { title: 'הזמנות בלבד', body: 'גישה נשלטת באמצעות הזמנות מייל. המארגן שולט במי שיכול לערוך מה — לכל קבוצה, תחרות ומשחק.' },
          { title: 'מותאם למגרש', body: 'עברית RTL, מובייל קודם, יעדי מגע גדולים, מצב לא־מקוון. עובד גם כשהקליטה גרועה.' },
        ].map(f => (
          <div key={f.title} className="rounded-xl2 bg-white dark:bg-ink-800 border border-ink-100 dark:border-ink-700 p-6 shadow-card">
            <div className="size-10 rounded-lg bg-pitch-100 dark:bg-pitch-950 text-pitch-700 dark:text-pitch-300 grid place-items-center mb-3">⚽</div>
            <h3 className="font-display font-semibold text-lg text-ink-900 dark:text-ink-50">{f.title}</h3>
            <p className="mt-2 text-sm text-ink-600 dark:text-ink-300 leading-relaxed">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { RotateCw } from 'lucide-react';
import { generateFixtures } from '@/lib/actions/competitions';
import { toast } from '@/lib/stores/toast';
import { useRouter } from 'next/navigation';

export function GenerateFixturesButton({ competitionId }: { competitionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!confirm('ליצור לוח משחקים אוטומטי? פעולה זו תוסיף משחקים חדשים.')) return;
    setLoading(true);
    try {
      const count = await generateFixtures(competitionId);
      toast.success(`נוצרו ${count} משחקים`);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message ?? 'יצירה נכשלה');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={run} disabled={loading} className="rounded-xl bg-white dark:bg-ink-800 ring-1 ring-ink-200 dark:ring-ink-700 px-3 h-10 inline-flex items-center gap-2 font-medium hover:bg-ink-50 dark:hover:bg-ink-700 disabled:opacity-50">
      <RotateCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
      ייצור מחדש
    </button>
  );
}

'use client';

import { useState } from 'react';
import { Copy, Check, Share2, ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { toast } from '@/lib/stores/toast';

export function ShareLinkCard({ competitionId, slug }: { competitionId: string; slug: string }) {
  // Hebrew/non-ASCII slugs need encoding for clipboard + clickable URL.
  const path = `/c/${encodeURIComponent(slug)}`;
  const url = typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('הקישור הועתק');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('העתקה נכשלה');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>קישור ציבורי</CardTitle>
        <p className="text-sm text-ink-500 dark:text-ink-400 mt-0.5">ניתן לשתף עם צופים ללא צורך בחשבון.</p>
      </CardHeader>
      <CardBody>
        <div className="flex items-center gap-3 rounded-xl bg-ink-50 dark:bg-ink-700/50 px-4 py-3 flex-wrap">
          <Share2 className="size-4 text-ink-500 dark:text-ink-400 shrink-0" />
          <a
            href={path}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-0 truncate text-sm text-pitch-700 dark:text-pitch-300 hover:underline font-medium tabular flex items-center gap-1.5"
            dir="ltr"
          >
            <span className="truncate">{url}</span>
            <ExternalLink className="size-3.5 shrink-0" />
          </a>
          <button onClick={copy} className="rounded-lg bg-white dark:bg-ink-800 ring-1 ring-ink-200 dark:ring-ink-700 px-3 h-9 inline-flex items-center gap-1.5 text-sm font-medium hover:bg-ink-100 dark:hover:bg-ink-700 shrink-0">
            {copied ? <Check className="size-4 text-pitch-600" /> : <Copy className="size-4" />}
            {copied ? 'הועתק' : 'העתקה'}
          </button>
        </div>
      </CardBody>
    </Card>
  );
}

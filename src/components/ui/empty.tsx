export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 rounded-xl2 border border-dashed border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800">
      <div className="mx-auto mb-4 size-12 rounded-full bg-pitch-100 dark:bg-pitch-900 grid place-items-center text-2xl">⚽</div>
      <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-ink-50">{title}</h3>
      {description && <p className="mt-1 text-sm text-ink-600 dark:text-ink-300 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

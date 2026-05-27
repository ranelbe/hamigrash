import * as React from 'react';
import { cn } from '@/lib/utils';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; error?: string };

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, hint, error, id, ...rest }, ref,
) {
  const inputId = id ?? React.useId();
  return (
    <div className="block w-full">
      {label && <label htmlFor={inputId} className="block mb-1.5 text-sm font-medium text-ink-800 dark:text-ink-200">{label}</label>}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'block w-full h-11 rounded-xl border border-ink-200 bg-white px-3 text-[15px] text-ink-900 placeholder:text-ink-400',
          'dark:bg-ink-900 dark:border-ink-800 dark:text-ink-50 dark:placeholder:text-ink-600',
          'focus:border-pitch-500 focus:ring-2 focus:ring-pitch-500/20 outline-none',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
          className,
        )}
        // Inherit RTL from <html dir="rtl"> so Hebrew placeholders align
        // right too. Use dir="ltr" explicitly on per-input basis (e.g. URLs,
        // emails) by passing dir via {...rest}.
        {...rest}
      />
      {hint && !error && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
});

export function Select({ className, label, hint, error, children, id, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; hint?: string; error?: string }) {
  const selectId = id ?? React.useId();
  return (
    <div className="block w-full">
      {label && <label htmlFor={selectId} className="block mb-1.5 text-sm font-medium text-ink-800 dark:text-ink-200">{label}</label>}
      <select
        id={selectId}
        className={cn(
          'block w-full h-11 rounded-xl border border-ink-200 bg-white px-3 text-[15px] text-ink-900',
          'dark:bg-ink-900 dark:border-ink-800 dark:text-ink-50',
          'focus:border-pitch-500 focus:ring-2 focus:ring-pitch-500/20 outline-none',
          error && 'border-red-500',
          className,
        )}
        {...rest}
      >{children}</select>
      {hint && !error && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

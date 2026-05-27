'use client';

import { useState } from 'react';
import type { ZodSchema } from 'zod';

// Tiny per-form helper:
//   validate(formData) → either returns parsed data, or sets field errors and returns null.
// Errors are keyed by dot-joined zod issue path so they line up with input names.

export function useFormErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate<T>(schema: ZodSchema<T>, data: unknown): T | null {
    const result = schema.safeParse(data);
    if (result.success) {
      setErrors({});
      return result.data;
    }
    const next: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_root';
      if (!next[key]) next[key] = issue.message;
    }
    setErrors(next);
    return null;
  }

  function clear(field?: string) {
    if (!field) { setErrors({}); return; }
    setErrors(prev => { const { [field]: _, ...rest } = prev; return rest; });
  }

  return { errors, validate, clear, setErrors };
}

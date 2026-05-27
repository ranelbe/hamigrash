'use client';

import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  ttl: number; // ms
}

interface ToastState {
  items: ToastItem[];
  push: (kind: ToastKind, message: string, ttl?: number) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToasts = create<ToastState>(set => ({
  items: [],
  push: (kind, message, ttl = 4000) => {
    const id = nextId++;
    set(s => ({ items: [...s.items, { id, kind, message, ttl }] }));
    if (ttl > 0) setTimeout(() => set(s => ({ items: s.items.filter(t => t.id !== id) })), ttl);
  },
  dismiss: id => set(s => ({ items: s.items.filter(t => t.id !== id) })),
}));

export const toast = {
  success: (msg: string) => useToasts.getState().push('success', msg),
  error:   (msg: string) => useToasts.getState().push('error', msg, 6000),
  info:    (msg: string) => useToasts.getState().push('info', msg),
};

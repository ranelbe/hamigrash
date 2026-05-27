'use client';

import { create } from 'zustand';

type UIState = {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebar: (open: boolean) => void;
};

export const useUI = create<UIState>(set => ({
  sidebarOpen: false,
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebar: open => set({ sidebarOpen: open }),
}));

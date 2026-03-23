"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserSummary } from "@/types/domain";

interface SessionState {
  activeUser: UserSummary | null;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setActiveUser: (user: UserSummary) => void;
  clearActiveUser: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      activeUser: null,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setActiveUser: (user) => set({ activeUser: user }),
      clearActiveUser: () => set({ activeUser: null }),
    }),
    {
      name: "cinematch-session",
      partialize: (state) => ({ activeUser: state.activeUser }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

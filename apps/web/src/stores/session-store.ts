"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type SessionState = {
  accessToken?: string;
  refreshToken?: string;
  companyId?: string;
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  setCompanyId: (companyId: string) => void;
  clear: () => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      setTokens: (tokens) => set(tokens),
      setCompanyId: (companyId) => set({ companyId }),
      clear: () => set({ accessToken: undefined, refreshToken: undefined, companyId: undefined })
    }),
    { name: "finos-session" }
  )
);

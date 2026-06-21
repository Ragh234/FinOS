"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type WorkspaceState = {
  navCollapsed: boolean;
  search: string;
  setNavCollapsed: (collapsed: boolean) => void;
  setSearch: (search: string) => void;
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      navCollapsed: false,
      search: "",
      setNavCollapsed: (navCollapsed) => set({ navCollapsed }),
      setSearch: (search) => set({ search })
    }),
    { name: "finos-workspace" }
  )
);

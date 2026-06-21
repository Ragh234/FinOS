"use client";

import { useRouter } from "next/navigation";
import { LogOut, Search } from "lucide-react";
import { AppNav } from "./nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSessionStore } from "@/stores/session-store";
import { useWorkspaceStore } from "@/stores/workspace-store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { companyId, clear } = useSessionStore();
  const { search, setSearch } = useWorkspaceStore();

  return (
    <div className="flex min-h-screen">
      <AppNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border bg-white px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input className="w-[360px]" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customers, invoices, products" />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="max-w-48 truncate">Company: {companyId ?? "not selected"}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clear();
                router.push("/auth/login");
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-auto p-4">{children}</main>
      </div>
    </div>
  );
}

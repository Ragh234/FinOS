"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  Bot,
  Boxes,
  Building2,
  CreditCard,
  FileText,
  Gauge,
  HandCoins,
  LayoutDashboard,
  Package,
  Receipt,
  ShieldCheck,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/products", label: "Products", icon: Package },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/payments", label: "Payments", icon: Receipt },
  { href: "/collections", label: "Collections", icon: HandCoins },
  { href: "/promises", label: "Promises", icon: ShieldCheck },
  { href: "/credit", label: "Credit", icon: CreditCard },
  { href: "/banking", label: "Banking", icon: Banknote },
  { href: "/ai-cfo", label: "AI CFO", icon: Bot },
  { href: "/setup/company", label: "Company", icon: Building2 }
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-[#eef3f7]">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <Gauge className="h-5 w-5 text-primary" />
        <div>
          <div className="text-sm font-bold">FinOS</div>
          <div className="text-[11px] text-muted-foreground">SME Finance Ops</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-9 items-center gap-2 rounded-md px-3 text-sm text-[#24313d] hover:bg-white",
                active && "bg-white font-semibold text-primary shadow-sm"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

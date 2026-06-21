import { cn } from "@/lib/utils";

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-sm border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground", className)}>{children}</span>;
}

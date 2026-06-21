import { cn } from "@/lib/utils";

export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-md border border-border bg-white", className)}>{children}</section>;
}

export function PanelHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-12 items-center justify-between border-b border-border px-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {action}
    </div>
  );
}

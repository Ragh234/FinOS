import { AlertCircle, Inbox, Loader2 } from "lucide-react";

export function LoadingState({ label = "Loading records" }: { label?: string }) {
  return (
    <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

export function EmptyState({ title = "No records found", detail }: { title?: string; detail?: string }) {
  return (
    <div className="flex h-44 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
      <Inbox className="h-5 w-5" />
      <div className="font-medium text-foreground">{title}</div>
      {detail ? <div>{detail}</div> : null}
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  return (
    <div className="flex h-40 items-center justify-center gap-2 text-sm text-destructive">
      <AlertCircle className="h-4 w-4" />
      {error instanceof Error ? error.message : "Something went wrong"}
    </div>
  );
}

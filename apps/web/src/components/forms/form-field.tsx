import { FieldError } from "react-hook-form";

export function FormField({ label, error, children }: { label: string; error?: FieldError; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {error ? <span className="text-xs text-destructive">{error.message}</span> : null}
    </label>
  );
}

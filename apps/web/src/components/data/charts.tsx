import { Panel, PanelHeader } from "@/components/ui/panel";
import { cn, formatMoney } from "@/lib/utils";

type Point = { label: string; value: number };

export function MiniBarChart({ title, data, className }: { title: string; data: Point[]; className?: string }) {
  const max = Math.max(...data.map((point) => point.value), 1);
  return (
    <Panel className={className}>
      <PanelHeader title={title} />
      <div className="flex h-56 items-end gap-2 p-4">
        {data.map((point) => (
          <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="w-full bg-primary/80" style={{ height: `${Math.max(8, (point.value / max) * 170)}px` }} title={formatMoney(point.value)} />
            <div className="w-full truncate text-center text-[11px] text-muted-foreground">{point.label}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function TrendChart({ title, data, className }: { title: string; data: Point[]; className?: string }) {
  const max = Math.max(...data.map((point) => point.value), 1);
  const width = 420;
  const height = 180;
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const points = data.map((point, index) => `${index * step},${height - (point.value / max) * (height - 20)}`).join(" ");
  return (
    <Panel className={className}>
      <PanelHeader title={title} />
      <div className="p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full">
          <polyline fill="none" stroke="hsl(var(--primary))" strokeWidth="3" points={points} />
          {data.map((point, index) => (
            <circle key={point.label} cx={index * step} cy={height - (point.value / max) * (height - 20)} r="4" fill="hsl(var(--primary))" />
          ))}
        </svg>
        <div className="grid grid-cols-6 gap-1 text-[11px] text-muted-foreground">
          {data.slice(-6).map((point) => <span key={point.label} className="truncate">{point.label}</span>)}
        </div>
      </div>
    </Panel>
  );
}

export function RiskDistribution({ data }: { data: { low?: number; medium?: number; high?: number } }) {
  const total = (data.low ?? 0) + (data.medium ?? 0) + (data.high ?? 0) || 1;
  const segments = [
    { label: "Low", value: data.low ?? 0, className: "bg-emerald-600" },
    { label: "Medium", value: data.medium ?? 0, className: "bg-amber-500" },
    { label: "High", value: data.high ?? 0, className: "bg-red-600" }
  ];
  return (
    <Panel>
      <PanelHeader title="Customer Risk Distribution" />
      <div className="p-4">
        <div className="flex h-8 overflow-hidden rounded-sm border border-border">
          {segments.map((segment) => (
            <div key={segment.label} className={cn(segment.className)} style={{ width: `${(segment.value / total) * 100}%` }} />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
          {segments.map((segment) => (
            <div key={segment.label}>
              <div className="text-xs text-muted-foreground">{segment.label}</div>
              <div className="font-semibold">{segment.value}</div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

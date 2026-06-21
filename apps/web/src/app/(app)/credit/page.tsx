"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/app/page-header";
import { DataTable } from "@/components/data/data-table";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { api } from "@/lib/api/client";
import { formatMoney } from "@/lib/utils";

export default function CreditPage() {
  const overview = useQuery({ queryKey: ["credit-overview"], queryFn: () => api.get<any>("/credit-intelligence/overview") });
  const customers = useQuery({ queryKey: ["credit-customers"], queryFn: () => api.get<any[]>("/credit-intelligence/customers") });
  return (
    <>
      <PageHeader title="Credit Command Center" description="Credit exposure, risk distribution, and customer profile status." />
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Panel className="p-4"><div className="text-xs text-muted-foreground">Total Exposure</div><div className="mt-2 text-xl font-semibold">{formatMoney(overview.data?.totalReceivableExposure)}</div></Panel>
          <Panel className="p-4"><div className="text-xs text-muted-foreground">Overdue</div><div className="mt-2 text-xl font-semibold">{formatMoney(overview.data?.overdueExposure)}</div></Panel>
          <Panel className="p-4"><div className="text-xs text-muted-foreground">High Risk</div><div className="mt-2 text-xl font-semibold">{overview.data?.riskDistribution?.high ?? 0}</div></Panel>
          <Panel className="p-4"><div className="text-xs text-muted-foreground">Open Invoices</div><div className="mt-2 text-xl font-semibold">{overview.data?.openInvoiceCount ?? 0}</div></Panel>
        </div>
        <DataTable
          rows={customers.data ?? []}
          isLoading={customers.isLoading}
          error={customers.error}
          columns={[
            { key: "customer", header: "Customer", cell: (row) => row.party?.name ?? row.partyId },
            { key: "score", header: "Score", cell: (row) => row.riskScore },
            { key: "level", header: "Risk", cell: (row) => <Badge>{row.riskLevel}</Badge> },
            { key: "exposure", header: "Exposure", cell: (row) => formatMoney(row.currentExposure) },
            { key: "utilization", header: "Utilization", cell: (row) => `${Number(row.utilizationPercent ?? 0).toFixed(1)}%` },
            { key: "hold", header: "Hold", cell: (row) => <Badge>{row.creditHold ? "Yes" : "No"}</Badge> }
          ]}
        />
      </div>
    </>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/app/page-header";
import { MiniBarChart, RiskDistribution, TrendChart } from "@/components/data/charts";
import { DataTable } from "@/components/data/data-table";
import { LoadingState } from "@/components/data/states";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { api } from "@/lib/api/client";
import { formatMoney } from "@/lib/utils";

function monthKey(value: string) {
  return new Date(value).toLocaleString("en-IN", { month: "short" });
}

export default function DashboardPage() {
  const credit = useQuery({ queryKey: ["credit-overview"], queryFn: () => api.get<any>("/credit-intelligence/overview") });
  const collections = useQuery({ queryKey: ["collections-dashboard"], queryFn: () => api.get<any>("/collections/dashboard") });
  const invoices = useQuery({ queryKey: ["invoices"], queryFn: () => api.get<any[]>("/sales/invoices") });
  const payments = useQuery({ queryKey: ["payments"], queryFn: () => api.get<any[]>("/payments") });
  const balances = useQuery({ queryKey: ["inventory-balances"], queryFn: () => api.get<any[]>("/inventory/balances") });

  if (credit.isLoading || collections.isLoading) return <LoadingState label="Loading executive dashboard" />;

  const invoiceRows = invoices.data ?? [];
  const paymentRows = payments.data ?? [];
  const inventoryValue = (balances.data ?? []).reduce((sum, row) => sum + Number(row.currentStock ?? 0) * Number(row.product?.costPrice ?? 0), 0);
  const revenue = invoiceRows.reduce((sum, row) => sum + Number(row.total ?? 0), 0);
  const cashPosition = paymentRows.reduce((sum, row) => sum + (row.direction === "IN" ? Number(row.amount ?? 0) : -Number(row.amount ?? 0)), 0);
  const estimatedProfit = invoiceRows.reduce((sum, row) => sum + Number(row.total ?? 0) * 0.18, 0);

  const kpis = [
    { label: "Cash Position", value: formatMoney(cashPosition) },
    { label: "Receivables", value: formatMoney(credit.data?.totalReceivableExposure) },
    { label: "Payables", value: formatMoney(0) },
    { label: "Inventory Value", value: formatMoney(inventoryValue) },
    { label: "Revenue", value: formatMoney(revenue) },
    { label: "Profit", value: formatMoney(estimatedProfit) },
    { label: "Expected Collections", value: formatMoney(credit.data?.expectedCollections ?? 0) },
    { label: "Risk Exposure", value: formatMoney(credit.data?.overdueExposure ?? collections.data?.overdueExposure) }
  ];

  const revenueTrend = invoiceRows.slice(-6).map((row) => ({ label: monthKey(row.issueDate), value: Number(row.total ?? 0) }));
  const collectionsTrend = paymentRows.filter((row) => row.direction === "IN").slice(-6).map((row) => ({ label: monthKey(row.paymentDate), value: Number(row.amount ?? 0) }));
  const cashTrend = paymentRows.slice(-6).reduce<Array<{ label: string; value: number }>>((points, row) => {
    const last = points.at(-1)?.value ?? 0;
    points.push({ label: monthKey(row.paymentDate), value: last + (row.direction === "IN" ? Number(row.amount) : -Number(row.amount)) });
    return points;
  }, []);
  const aging = [
    { label: "Current", value: Number(credit.data?.totalReceivableExposure ?? 0) - Number(credit.data?.overdueExposure ?? 0) },
    { label: "Overdue", value: Number(credit.data?.overdueExposure ?? 0) },
    { label: "Promises", value: Number(collections.data?.openPromises ?? 0) * 10000 }
  ];

  return (
    <>
      <PageHeader title="Executive Dashboard" description="Cash, collections, revenue, stock value, and credit risk in one operating view." />
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          {kpis.map((metric) => (
            <Panel key={metric.label} className="p-4">
              <div className="text-xs text-muted-foreground">{metric.label}</div>
              <div className="mt-2 text-xl font-semibold">{metric.value}</div>
            </Panel>
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <TrendChart title="Cashflow Trend" data={cashTrend.length ? cashTrend : [{ label: "Now", value: cashPosition }]} />
          <TrendChart title="Collections Trend" data={collectionsTrend.length ? collectionsTrend : [{ label: "Now", value: 0 }]} />
          <TrendChart title="Revenue Trend" data={revenueTrend.length ? revenueTrend : [{ label: "Now", value: revenue }]} />
          <MiniBarChart title="Outstanding Aging" data={aging} />
          <RiskDistribution data={credit.data?.riskDistribution ?? { low: 0, medium: 0, high: 0 }} />
          <DataTable
            rows={invoiceRows.slice(0, 6)}
            columns={[
              { key: "number", header: "Invoice", cell: (row) => <span className="font-mono text-xs">{row.number}</span> },
              { key: "customer", header: "Customer", cell: (row) => row.party?.name ?? "-" },
              { key: "total", header: "Total", cell: (row) => formatMoney(row.total) },
              { key: "status", header: "Status", cell: (row) => <Badge>{row.status}</Badge> }
            ]}
            isLoading={invoices.isLoading}
            error={invoices.error}
          />
        </div>
      </div>
    </>
  );
}

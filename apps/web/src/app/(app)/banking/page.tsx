"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { DataTable } from "@/components/data/data-table";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api/client";
import { formatMoney } from "@/lib/utils";

export default function BankingPage() {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: "", accountType: "CURRENT", currency: "INR", openingBalance: 0 });
  const queryClient = useQueryClient();
  const accounts = useQuery({ queryKey: ["bank-accounts"], queryFn: () => api.get<any[]>("/banking/accounts") });
  const reconciliations = useQuery({ queryKey: ["bank-reconciliations"], queryFn: () => api.get<any[]>("/banking/reconciliations") });
  const mutation = useMutation({
    mutationFn: () => api.post("/banking/accounts", form),
    onSuccess: () => {
      setShow(false);
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
    }
  });

  return (
    <>
      <PageHeader title="Banking & Reconciliation" description="Bank accounts, cash balances, and reconciliation workflow." actions={<Button onClick={() => setShow((v) => !v)}><Plus className="h-4 w-4" />Account</Button>} />
      <div className="grid gap-4">
        {show ? (
          <Panel>
            <PanelHeader title="New Bank Account" />
            <form className="grid gap-3 p-4 md:grid-cols-4" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
              <FormField label="Name"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></FormField>
              <FormField label="Type"><Select value={form.accountType} onChange={(event) => setForm({ ...form, accountType: event.target.value })}><option value="CURRENT">Current</option><option value="SAVINGS">Savings</option><option value="CASH">Cash</option></Select></FormField>
              <FormField label="Currency"><Input value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })} /></FormField>
              <FormField label="Opening"><Input type="number" value={form.openingBalance} onChange={(event) => setForm({ ...form, openingBalance: Number(event.target.value) })} /></FormField>
              <Button className="md:col-span-4" disabled={mutation.isPending}>Save account</Button>
            </form>
          </Panel>
        ) : null}
        <DataTable
          rows={accounts.data ?? []}
          isLoading={accounts.isLoading}
          error={accounts.error}
          columns={[
            { key: "name", header: "Account", cell: (row) => <span className="font-medium">{row.name}</span> },
            { key: "type", header: "Type", cell: (row) => row.accountType },
            { key: "currency", header: "Currency", cell: (row) => row.currency },
            { key: "balance", header: "Current", cell: (row) => formatMoney(row.currentBalance, row.currency) },
            { key: "statement", header: "Statement", cell: (row) => formatMoney(row.statementBalance, row.currency) }
          ]}
        />
        <DataTable
          rows={reconciliations.data ?? []}
          isLoading={reconciliations.isLoading}
          error={reconciliations.error}
          columns={[
            { key: "account", header: "Account", cell: (row) => row.bankAccount?.name ?? "-" },
            { key: "period", header: "Period", cell: (row) => `${row.periodStart?.slice(0, 10)} - ${row.periodEnd?.slice(0, 10)}` },
            { key: "difference", header: "Difference", cell: (row) => formatMoney(row.difference) },
            { key: "status", header: "Status", cell: (row) => row.status }
          ]}
        />
      </div>
    </>
  );
}

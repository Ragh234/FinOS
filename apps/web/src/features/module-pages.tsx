"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { FieldValues, useForm } from "react-hook-form";
import { z } from "zod";
import { PageHeader } from "@/components/app/page-header";
import { Column, DataTable } from "@/components/data/data-table";
import { FormField } from "@/components/forms/form-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import { followUpSchema, invoiceSchema, locationSchema, paymentSchema, productSchema, promiseSchema, customerSchema } from "@/lib/schemas/core";
import { formatDate, formatMoney, makeIdempotencyKey } from "@/lib/utils";

type RecordRow = Record<string, any>;
type Field = { name: string; label: string; type?: "text" | "number" | "date" | "select" | "textarea" | "checkbox"; options?: Array<{ label: string; value: string }> };
type ListResponse = RecordRow[] | { data: RecordRow[] };

function listRows(response: ListResponse | undefined) {
  return Array.isArray(response) ? response : response?.data ?? [];
}

function filterRows(rows: RecordRow[] | undefined, search: string) {
  if (!search) return rows ?? [];
  const value = search.toLowerCase();
  return (rows ?? []).filter((row) => JSON.stringify(row).toLowerCase().includes(value));
}

export function CrudModulePage<TValues extends FieldValues>({
  title,
  description,
  queryKey,
  listPath,
  createPath,
  schema,
  defaults,
  fields,
  columns,
  idempotent = false,
  toPayload
}: {
  title: string;
  description: string;
  queryKey: string;
  listPath: string;
  createPath: string;
  schema: z.ZodTypeAny;
  defaults: TValues;
  fields: Field[];
  columns: Column<RecordRow>[];
  idempotent?: boolean;
  toPayload?: (values: TValues) => unknown;
}) {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: [queryKey], queryFn: () => api.get<ListResponse>(listPath) });
  const rows = useMemo(() => filterRows(listRows(query.data), search), [query.data, search]);
  const form = useForm<TValues>({ resolver: zodResolver(schema as any) as any, defaultValues: defaults as any });
  const mutation = useMutation({
    mutationFn: (values: TValues) => api.post(createPath, toPayload ? toPayload(values) : values, idempotent ? makeIdempotencyKey(queryKey) : undefined),
    onSuccess: () => {
      form.reset(defaults);
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    }
  });

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            <Button variant="outline" onClick={() => query.refetch()}><RefreshCw className="h-4 w-4" />Refresh</Button>
            <Button onClick={() => setShowForm((value) => !value)}><Plus className="h-4 w-4" />New</Button>
          </>
        }
      />
      <div className="grid gap-4">
        {showForm ? (
          <Panel>
            <PanelHeader title={`New ${title.slice(0, -1)}`} />
            <form className="grid gap-3 p-4 md:grid-cols-3" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
              {fields.map((field) => (
                <FormField key={field.name} label={field.label} error={(form.formState.errors as any)[field.name]}>
                  {field.type === "select" ? (
                    <Select {...form.register(field.name as any)}>
                      <option value="">Select</option>
                      {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </Select>
                  ) : field.type === "textarea" ? (
                    <Textarea {...form.register(field.name as any)} />
                  ) : field.type === "checkbox" ? (
                    <input className="h-4 w-4" type="checkbox" {...form.register(field.name as any)} />
                  ) : (
                    <Input type={field.type ?? "text"} {...form.register(field.name as any)} />
                  )}
                </FormField>
              ))}
              {mutation.error ? <div className="md:col-span-3 text-sm text-destructive">{mutation.error.message}</div> : null}
              <div className="flex gap-2 md:col-span-3">
                <Button disabled={mutation.isPending}>{mutation.isPending ? "Saving" : "Save"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </Panel>
        ) : null}
        <DataTable rows={rows} columns={columns} isLoading={query.isLoading} error={query.error} search={search} onSearch={setSearch} emptyTitle={`No ${title.toLowerCase()} found`} />
      </div>
    </>
  );
}

export function CustomersPage() {
  return (
    <CrudModulePage
      title="Customers"
      description="Maintain customer master data, credit limits, and contact details."
      queryKey="customers"
      listPath="/customers"
      createPath="/customers"
      schema={customerSchema}
      defaults={{ name: "", contactName: "", email: "", phone: "", creditLimit: 0 }}
      fields={[
        { name: "name", label: "Customer name" },
        { name: "contactName", label: "Contact" },
        { name: "email", label: "Email" },
        { name: "phone", label: "Phone" },
        { name: "creditLimit", label: "Credit limit", type: "number" }
      ]}
      columns={[
        { key: "name", header: "Customer", cell: (row) => <span className="font-medium">{row.name}</span> },
        { key: "contact", header: "Contact", cell: (row) => row.contactName ?? "-" },
        { key: "email", header: "Email", cell: (row) => row.email ?? "-" },
        { key: "credit", header: "Credit Limit", cell: (row) => formatMoney(row.creditLimit) },
        { key: "risk", header: "Risk", cell: (row) => <Badge>{row.riskLevel ?? "LOW"}</Badge> }
      ]}
    />
  );
}

export function ProductsPage() {
  const units = useQuery({ queryKey: ["product-units"], queryFn: () => api.get<RecordRow[]>("/products/master/units") });
  return (
    <CrudModulePage
      title="Products"
      description="Define products, SKU, pricing, inventory behavior, and units."
      queryKey="products"
      listPath="/products"
      createPath="/products"
      schema={productSchema}
      defaults={{ name: "", sku: "", unitId: "", costPrice: 0, sellingPrice: 0, isInventoryItem: true }}
      fields={[
        { name: "name", label: "Product name" },
        { name: "sku", label: "SKU" },
        { name: "unitId", label: "Unit", type: "select", options: units.data?.map((unit) => ({ label: `${unit.code} - ${unit.name}`, value: unit.id })) ?? [] },
        { name: "costPrice", label: "Cost price", type: "number" },
        { name: "sellingPrice", label: "Selling price", type: "number" },
        { name: "isInventoryItem", label: "Inventory item", type: "checkbox" }
      ]}
      columns={[
        { key: "sku", header: "SKU", cell: (row) => <span className="font-mono text-xs">{row.sku}</span> },
        { key: "name", header: "Product", cell: (row) => <span className="font-medium">{row.name}</span> },
        { key: "unit", header: "Unit", cell: (row) => row.unit?.code ?? "-" },
        { key: "cost", header: "Cost", cell: (row) => formatMoney(row.costPrice) },
        { key: "sell", header: "Selling", cell: (row) => formatMoney(row.sellingPrice) },
        { key: "active", header: "Status", cell: (row) => <Badge>{row.isActive ? "Active" : "Inactive"}</Badge> }
      ]}
    />
  );
}

export function InventoryPage() {
  return (
    <CrudModulePage
      title="Inventory"
      description="Manage stock locations and monitor inventory balances."
      queryKey="inventory-locations"
      listPath="/inventory/locations"
      createPath="/inventory/locations"
      schema={locationSchema}
      defaults={{ name: "", code: "", address: "" }}
      fields={[{ name: "name", label: "Location name" }, { name: "code", label: "Code" }, { name: "address", label: "Address", type: "textarea" }]}
      columns={[
        { key: "code", header: "Code", cell: (row) => <span className="font-mono text-xs">{row.code}</span> },
        { key: "name", header: "Location", cell: (row) => <span className="font-medium">{row.name}</span> },
        { key: "address", header: "Address", cell: (row) => row.address ?? "-" },
        { key: "active", header: "Status", cell: (row) => <Badge>{row.isActive ? "Active" : "Inactive"}</Badge> }
      ]}
    />
  );
}

export function InvoicesPage() {
  const customers = useQuery({ queryKey: ["customers"], queryFn: () => api.get<ListResponse>("/customers") });
  return (
    <CrudModulePage
      title="Invoices"
      description="Create and track sales invoices with ledger-backed status."
      queryKey="invoices"
      listPath="/sales/invoices"
      createPath="/sales/invoices"
      schema={invoiceSchema}
      defaults={{ partyId: "", issueDate: new Date().toISOString().slice(0, 10), dueDate: "", description: "", quantity: 1, unitPrice: 0, taxRate: 0 }}
      toPayload={(value) => ({
        partyId: value.partyId,
        issueDate: value.issueDate,
        dueDate: value.dueDate || undefined,
        lines: [{ description: value.description, quantity: value.quantity, unitPrice: value.unitPrice, taxRate: value.taxRate }]
      })}
      fields={[
        { name: "partyId", label: "Customer", type: "select", options: listRows(customers.data).map((customer) => ({ label: customer.name, value: customer.id })) },
        { name: "issueDate", label: "Issue date", type: "date" },
        { name: "dueDate", label: "Due date", type: "date" },
        { name: "description", label: "Line description" },
        { name: "quantity", label: "Quantity", type: "number" },
        { name: "unitPrice", label: "Unit price", type: "number" },
        { name: "taxRate", label: "Tax %", type: "number" }
      ]}
      columns={[
        { key: "number", header: "Invoice", cell: (row) => <span className="font-mono text-xs">{row.number}</span> },
        { key: "customer", header: "Customer", cell: (row) => row.party?.name ?? "-" },
        { key: "date", header: "Issue Date", cell: (row) => formatDate(row.issueDate) },
        { key: "due", header: "Due", cell: (row) => formatDate(row.dueDate) },
        { key: "total", header: "Total", cell: (row) => formatMoney(row.total) },
        { key: "status", header: "Status", cell: (row) => <Badge>{row.status}</Badge> }
      ]}
      idempotent
    />
  );
}

export function PaymentsPage() {
  const customers = useQuery({ queryKey: ["customers"], queryFn: () => api.get<ListResponse>("/customers") });
  return (
    <CrudModulePage
      title="Payments"
      description="Record customer receipts and supplier payments with ledger posting."
      queryKey="payments"
      listPath="/payments"
      createPath="/payments"
      schema={paymentSchema}
      defaults={{ partyId: "", direction: "IN", paymentDate: new Date().toISOString().slice(0, 10), amount: 0, method: "BANK" }}
      fields={[
        { name: "partyId", label: "Party", type: "select", options: listRows(customers.data).map((customer) => ({ label: customer.name, value: customer.id })) },
        { name: "direction", label: "Direction", type: "select", options: [{ label: "Incoming", value: "IN" }, { label: "Outgoing", value: "OUT" }] },
        { name: "paymentDate", label: "Payment date", type: "date" },
        { name: "amount", label: "Amount", type: "number" },
        { name: "method", label: "Method" }
      ]}
      columns={[
        { key: "number", header: "Payment", cell: (row) => <span className="font-mono text-xs">{row.number}</span> },
        { key: "party", header: "Party", cell: (row) => row.party?.name ?? "-" },
        { key: "date", header: "Date", cell: (row) => formatDate(row.paymentDate) },
        { key: "amount", header: "Amount", cell: (row) => formatMoney(row.amount) },
        { key: "direction", header: "Direction", cell: (row) => <Badge>{row.direction}</Badge> },
        { key: "status", header: "Status", cell: (row) => <Badge>{row.status}</Badge> }
      ]}
      idempotent
    />
  );
}

export function CollectionsPage() {
  const customers = useQuery({ queryKey: ["customers"], queryFn: () => api.get<ListResponse>("/customers") });
  return (
    <CrudModulePage
      title="Collections"
      description="Plan and track collection follow-ups across overdue receivables."
      queryKey="collection-follow-ups"
      listPath="/collections/follow-ups"
      createPath="/collections/follow-ups"
      schema={followUpSchema}
      defaults={{ partyId: "", invoiceId: "", dueDate: new Date().toISOString().slice(0, 10), priority: 3, expectedAmount: 0, notes: "" }}
      fields={[
        { name: "partyId", label: "Customer", type: "select", options: listRows(customers.data).map((customer) => ({ label: customer.name, value: customer.id })) },
        { name: "dueDate", label: "Due date", type: "date" },
        { name: "priority", label: "Priority", type: "number" },
        { name: "expectedAmount", label: "Expected amount", type: "number" },
        { name: "notes", label: "Notes", type: "textarea" }
      ]}
      columns={[
        { key: "party", header: "Customer", cell: (row) => row.party?.name ?? "-" },
        { key: "due", header: "Due", cell: (row) => formatDate(row.dueDate) },
        { key: "priority", header: "Priority", cell: (row) => <Badge>P{row.priority}</Badge> },
        { key: "amount", header: "Expected", cell: (row) => formatMoney(row.expectedAmount) },
        { key: "status", header: "Status", cell: (row) => <Badge>{row.status}</Badge> }
      ]}
      idempotent
    />
  );
}

export function PromisesPage() {
  const customers = useQuery({ queryKey: ["customers"], queryFn: () => api.get<ListResponse>("/customers") });
  return (
    <CrudModulePage
      title="Promises"
      description="Track promise-to-pay commitments and fulfillment status."
      queryKey="promises"
      listPath="/collections/promises"
      createPath="/collections/promises"
      schema={promiseSchema}
      defaults={{ partyId: "", invoiceId: "", promisedAmount: 0, promisedDate: new Date().toISOString().slice(0, 10), notes: "" }}
      fields={[
        { name: "partyId", label: "Customer", type: "select", options: listRows(customers.data).map((customer) => ({ label: customer.name, value: customer.id })) },
        { name: "promisedAmount", label: "Promised amount", type: "number" },
        { name: "promisedDate", label: "Promised date", type: "date" },
        { name: "notes", label: "Notes", type: "textarea" }
      ]}
      columns={[
        { key: "party", header: "Customer", cell: (row) => row.party?.name ?? "-" },
        { key: "amount", header: "Promised", cell: (row) => formatMoney(row.promisedAmount) },
        { key: "paid", header: "Paid", cell: (row) => formatMoney(row.paidAmount) },
        { key: "date", header: "Date", cell: (row) => formatDate(row.promisedDate) },
        { key: "status", header: "Status", cell: (row) => <Badge>{row.status}</Badge> }
      ]}
      idempotent
    />
  );
}

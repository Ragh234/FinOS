"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PageHeader } from "@/components/app/page-header";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { api } from "@/lib/api/client";
import { companySchema } from "@/lib/schemas/core";
import { useSessionStore } from "@/stores/session-store";

type CompanyValues = z.input<typeof companySchema>;

export default function CompanySetupPage() {
  const router = useRouter();
  const setCompanyId = useSessionStore((state) => state.setCompanyId);
  const companyId = useSessionStore((state) => state.companyId);
  const companies = useQuery({
    queryKey: ["companies"],
    queryFn: () => api.get<Array<{ id: string; name: string; currency: string }>>("/companies")
  });
  const current = useQuery({ queryKey: ["company", companyId], queryFn: () => api.get<Record<string, unknown>>("/companies/current"), enabled: Boolean(companyId) });
  const form = useForm<CompanyValues>({ resolver: zodResolver(companySchema), defaultValues: { name: "", currency: "INR", financialYearStart: "2026-04-01" } });
  const mutation = useMutation({
    mutationFn: (values: CompanyValues) => api.post<{ id: string }>("/companies", companySchema.parse(values)),
    onSuccess: (company) => {
      setCompanyId(company.id);
      router.push("/dashboard");
    }
  });

  return (
    <>
      <PageHeader title="Company Setup" description="Create or select the operating company for tenant-scoped workflows." />
      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <Panel>
          <PanelHeader title="Create Company" />
          <form className="grid gap-3 p-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <FormField label="Company name" error={form.formState.errors.name}><Input {...form.register("name")} /></FormField>
            <FormField label="Currency" error={form.formState.errors.currency}><Input {...form.register("currency")} /></FormField>
            <FormField label="Financial year start" error={form.formState.errors.financialYearStart}><Input type="date" {...form.register("financialYearStart")} /></FormField>
            {mutation.error ? <div className="text-sm text-destructive">{mutation.error.message}</div> : null}
            <Button disabled={mutation.isPending}>{mutation.isPending ? "Creating" : "Create company"}</Button>
          </form>
        </Panel>
        <Panel>
          <PanelHeader title="Your Companies" />
          <div className="grid gap-3 p-4 text-sm">
            {(companies.data ?? []).map((company) => (
              <button
                key={company.id}
                type="button"
                className="rounded-md border border-border p-3 text-left hover:bg-muted"
                onClick={() => {
                  setCompanyId(company.id);
                  router.push("/dashboard");
                }}
              >
                <div className="font-medium">{company.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{company.currency} | {company.id}</div>
              </button>
            ))}
            {!companies.isLoading && !(companies.data ?? []).length ? <div>No existing company found. Create one using the form.</div> : null}
            {companyId ? <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(current.data ?? { id: companyId }, null, 2)}</pre> : null}
          </div>
        </Panel>
      </div>
    </>
  );
}

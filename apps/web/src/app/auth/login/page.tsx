"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { FormField } from "@/components/forms/form-field";
import { api, apiRequest } from "@/lib/api/client";
import { loginSchema } from "@/lib/schemas/core";
import { useSessionStore } from "@/stores/session-store";

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setTokens = useSessionStore((state) => state.setTokens);
  const setCompanyId = useSessionStore((state) => state.setCompanyId);
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const mutation = useMutation({
    mutationFn: (values: LoginValues) => apiRequest<{ accessToken: string; refreshToken: string }>("/auth/login", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: async (tokens) => {
      setTokens(tokens);
      const companies = await api.get<Array<{ id: string }>>("/companies");
      if (companies[0]) {
        setCompanyId(companies[0].id);
        router.push("/dashboard");
        return;
      }
      router.push("/setup/company");
    }
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef3f7] p-6">
      <Panel className="w-full max-w-sm p-5">
        <h1 className="text-lg font-semibold">Sign in to FinOS</h1>
        <form className="mt-4 grid gap-3" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <FormField label="Email" error={form.formState.errors.email}>
            <Input {...form.register("email")} />
          </FormField>
          <FormField label="Password" error={form.formState.errors.password}>
            <Input type="password" {...form.register("password")} />
          </FormField>
          {mutation.error ? <div className="text-sm text-destructive">{mutation.error.message}</div> : null}
          <Button disabled={mutation.isPending}>{mutation.isPending ? "Signing in" : "Sign in"}</Button>
        </form>
      </Panel>
    </main>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { apiRequest } from "@/lib/api/client";
import { signupSchema } from "@/lib/schemas/core";

type SignupValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const form = useForm<SignupValues>({ resolver: zodResolver(signupSchema), defaultValues: { email: "", password: "", name: "", phone: "" } });
  const mutation = useMutation({
    mutationFn: (values: SignupValues) => apiRequest("/auth/signup", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => router.push("/auth/login")
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef3f7] p-6">
      <Panel className="w-full max-w-md p-5">
        <h1 className="text-lg font-semibold">Create FinOS account</h1>
        <form className="mt-4 grid grid-cols-2 gap-3" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <FormField label="Name" error={form.formState.errors.name}><Input {...form.register("name")} /></FormField>
          <FormField label="Phone" error={form.formState.errors.phone}><Input {...form.register("phone")} /></FormField>
          <div className="col-span-2"><FormField label="Email" error={form.formState.errors.email}><Input {...form.register("email")} /></FormField></div>
          <div className="col-span-2"><FormField label="Password" error={form.formState.errors.password}><Input type="password" {...form.register("password")} /></FormField></div>
          {mutation.error ? <div className="col-span-2 text-sm text-destructive">{mutation.error.message}</div> : null}
          <Button className="col-span-2" disabled={mutation.isPending}>{mutation.isPending ? "Creating" : "Create account"}</Button>
        </form>
      </Panel>
    </main>
  );
}

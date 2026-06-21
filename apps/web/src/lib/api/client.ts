"use client";

import { useSessionStore } from "@/stores/session-store";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type ApiError = { error?: { code?: string; message?: string }; message?: string };

export async function apiRequest<T>(path: string, options: RequestInit & { idempotencyKey?: string } = {}): Promise<T> {
  const { accessToken, companyId } = useSessionStore.getState();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (companyId) headers.set("x-company-id", companyId);
  if (options.idempotencyKey) headers.set("Idempotency-Key", options.idempotencyKey);

  const response = await fetch(`${API_BASE}/v1${path}`, { ...options, headers });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(body.error?.message ?? body.message ?? `Request failed: ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body?: unknown, idempotencyKey?: string) =>
    apiRequest<T>(path, { method: "POST", body: JSON.stringify(body ?? {}), idempotencyKey }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: "DELETE" })
};

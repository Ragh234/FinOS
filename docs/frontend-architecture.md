# FinOS Frontend Architecture

The FinOS web app is a desktop-first ERP interface built with Next.js 15, TypeScript, Tailwind, shadcn-style primitives, TanStack Query, Zustand, React Hook Form, and Zod.

## Folder Structure

```text
apps/web/src/
  app/                    Next.js App Router routes
    (app)/                Authenticated ERP workspace
    auth/                 Login and signup
  components/
    app/                  ERP shell, navigation, page headers
    data/                 Reusable data table, states, filters
    forms/                Reusable form fields
    ui/                   shadcn-style primitives
  features/               Screen-level business modules
  lib/
    api/                  API client and endpoint helpers
    schemas/              Zod validation schemas
    utils.ts              UI utilities
  providers/              Query and app providers
  stores/                 Zustand auth/workspace stores
```

## Routing

- `/auth/login`
- `/auth/signup`
- `/setup/company`
- `/dashboard`
- `/customers`
- `/products`
- `/inventory`
- `/invoices`
- `/payments`
- `/collections`
- `/promises`
- `/credit`
- `/banking`

## State Strategy

- TanStack Query owns server state, caching, mutation invalidation, loading, and error states.
- Zustand owns local workspace state: access token, refresh token, active company, collapsed navigation, table preferences.
- React Hook Form + Zod owns form state and validation.

## API Integration

The frontend treats NestJS APIs as the source of truth. The API client injects:

- `Authorization: Bearer <token>`
- `x-company-id: <companyId>`
- `Idempotency-Key` for protected financial mutations when provided

All module screens use query keys scoped by module and company.

## Layout System

The ERP shell is a restrained, dense workspace:

- left module navigation
- top company/status bar
- page headers with primary actions
- filter/search row
- responsive data tables
- compact modal-style forms

The design avoids marketing sections, glass effects, crypto-dashboard styling, and oversized hero content.

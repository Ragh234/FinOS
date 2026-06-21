# FinOS Study Guide — From Basics to Advanced (Interview Ready)

This guide teaches web fundamentals (for non-developers) and progresses to advanced, repo-specific topics used in this repository so you can be interview-ready. Read sections in order: Foundations → Project Overview → Backend → Frontend → Domain Walkthroughs → Interview Prep → Exercises.

## How to use this guide
- Read the Foundations if you're new to web development (JSON, HTTP, React, TypeScript).
- Follow Project Overview to understand how this repo is organized.
- Deep-dive into Backend/Frontend sections to learn implementation details and where to look in the code.
- Use Interview Prep and Exercises to practice and verify understanding.

## Quick dev commands
Run these from the repo root:

```powershell
pnpm install
pnpm --filter ./apps/api dev
pnpm --filter ./apps/web dev
```

If you want to run only tests for the API:

```powershell
pnpm --filter ./apps/api test
```

---

**PART 1 — Foundations (Beginner-friendly)**

1) What is JSON?
- JSON (JavaScript Object Notation) is a lightweight text format for exchanging data. Example:

```json
{
  "id": 1,
  "name": "Acme Co",
  "invoices": [ { "id": 10, "amount": 100.0 } ]
}
```

2) What is HTTP and REST?
- HTTP is the protocol browsers use to talk to servers. REST is a style of designing HTTP APIs using verbs (GET, POST, PUT, DELETE) and resource URLs.

3) What is a web framework?
- Backend frameworks (e.g., NestJS) provide structure (controllers, services, modules) for building APIs safely and testably.

4) What is React and Next.js?
- React is a UI library for building component-based user interfaces. Next.js is a React framework offering server rendering, routing, and optimizations.

5) What is TypeScript?
- TypeScript is JavaScript with types. Types reduce runtime errors and improve developer productivity through IDE autocompletion.

6) What is CSS and Tailwind?
- CSS styles pages. Tailwind is a utility-first framework that provides small CSS classes (e.g., `flex`, `mt-2`) for rapid UI building.

7) Basics of databases and ORMs
- A relational DB (PostgreSQL) stores structured data. An ORM (Prisma) maps database tables to TypeScript objects and helps run safe queries and migrations.

8) Background jobs and queues
- Long-running tasks (emails, analytics, heavy processing) should run outside request handlers using job queues like BullMQ (Redis-backed).

---

**PART 2 — Project Overview (Monorepo + Apps)**

High-level layout (what you should know):
- `apps/web` — Next.js frontend (UI, pages, components).
- `apps/api` — NestJS backend (controllers, services, domain logic).
- `packages/database` — Prisma schema, migrations, seed scripts.
- `docker-compose.yml` — Local services (Postgres, Redis, API, Web) for dev.
- `pnpm-workspace.yaml` and `turbo.json` — Monorepo tooling; `pnpm` installs and `turbo` orchestrates builds/tests.

Why monorepo?
- Allows shared code (types, DB models), consistent tooling, and easier refactoring across frontend/backend.

Where to start reading in the repo:
- Read `README.md` for product summary and quickstart.
- Read `SYSTEM_ARCHITECTURE.md` to understand multi-tenancy, outbox, and core design rationale.

---

**PART 3 — Backend Deep Dive (NestJS + Prisma + Domain Patterns)**

Core concepts to know:
- NestJS modules/controllers/providers: Controllers handle HTTP; services (providers) hold business logic; modules group related features.
- DTOs + validation: NestJS uses DTO classes with `class-validator` to validate incoming requests before they reach business logic.
- Authentication: JWT access + refresh tokens via Passport.js; `Authorization: Bearer <token>` header.
- Prisma ORM: Schema defined in `packages/database/prisma/schema.prisma`; generate a typed client and use it in services for DB access.

Important backend patterns in this repo:
- Idempotency keys: financial mutations include an `Idempotency-Key` header to ensure retries don't duplicate effects.
- Transactional Outbox: business write and outbox event insert happen inside the same DB transaction, then a worker publishes events to Redis/BullMQ.
- Reversals: instead of deleting history, reversals create compensating transactions (preserves audit trail).
- Multi-tenancy: every record scoped by `companyId`; guards validate a user belongs to the requested company.

Files to read (backend):
- `apps/api/src/modules/auth` — authentication flows, JWT handling.
- `apps/api/src/modules/accounting` — ledger posting, double-entry rules.
- `apps/api/src/modules/payments` — payment creation and allocation.
- `apps/api/src/modules/automation` — outbox publisher and workers.
- `apps/api/src/shared` — idempotency, RBAC, sequences, audit helpers.

Example: safe payment creation flow (conceptual)
1. API receives POST /payments with `Idempotency-Key`.
2. Idempotency service checks if key already used; if yes, return stored result.
3. Begin DB transaction: create payment, allocate to invoices, write journal entries, insert outbox event.
4. Commit transaction.
5. Outbox worker picks up event and publishes to BullMQ.

---

**PART 4 — Frontend Deep Dive (Next.js + React + TanStack Query)**

Key frontend pieces:
- `apps/web/src/app` — Next.js App Router layout and protected routes.
- `apps/web/src/lib/api` — typed API client used with TanStack Query for data fetching.
- `apps/web/src/lib/schemas` — Zod schemas that mirror backend DTOs for validation.
- `apps/web/src/stores` — Zustand stores for session and UI state.

Data fetching pattern:
- Use TanStack Query to fetch and cache server data (`useQuery`) and update via `useMutation` which invalidates queries when mutations succeed.

Forms and validation:
- React Hook Form manages form state; Zod performs schema validation. This combination provides performant forms with strong type safety.

Auth flow on the UI:
- User logs in via `/auth` page; client stores access token (in memory or http-only cookie) and refresh token handling is delegated to the backend.

Files to read (frontend):
- `apps/web/src/app/layout.tsx` — root providers and navigation.
- `apps/web/src/lib/api` — API client with auth header injection.
- `apps/web/src/stores/session-store.ts` — session and company selection logic.

---

**PART 5 — Domain Walkthroughs (Accounting, Payments, Inventory, Banking, Collections)**

Accounting (double-entry)
- Principle: every financial transaction affects at least two accounts (debit and credit) and must balance to zero net change. This repo enforces posting via accounting services (`apps/api/src/modules/accounting`).

Payments lifecycle
- Create, verify, allocate to invoice(s), and optionally reverse. Idempotency prevents double-charging.

Inventory concurrency
- Prevent negative stock via DB constraints and careful decrement logic; consider optimistic locks for high-concurrency sale flows.

Banking and reconciliation
- Bank transactions imported (CSV/MT940) are matched against ledger entries and bank accounts; unmatched items appear as recon suggestions.

Collections and credit intelligence
- Promises to pay produce scheduled follow-ups; broken promises increase risk scores and trigger more aggressive collection workflows.

Files: read `BUSINESS_WORKFLOWS.md` and `DATABASE_DESIGN.md` for mapping between business and models.

---

**PART 6 — Deployment, Observability & Security**

Deployment
- `docker-compose.yml` spins up Postgres, Redis, API, and Web for local development.
- Environment variables control secrets (`DATABASE_URL`, `JWT_ACCESS_SECRET`, etc.).

Observability
- Correlation IDs, audit logs, and job metadata (jobId, correlationId) provide traceability.

Security
- Passwords hashed with Argon2. Use `Helmet` for HTTP security headers. RBAC checks at controller guards prevent unauthorized access.

---

**PART 7 — Testing & Debugging**

Tests
- Backend uses Jest. Look at `apps/api/*.spec.ts` files for unit and integration tests.

Debugging tips
- Reproduce with seed data from `packages/database/prisma/seed.ts`.
- Use Prisma Studio or psql to inspect DB state.

---

**PART 8 — Interview Prep (Questions + Short Answers)**

Q: What is idempotency and why is it important for payments?
A: Idempotency ensures that retrying the same request (e.g., due to network timeout) does not create duplicate side effects. For payments it prevents double-charging.

Q: Explain the transactional outbox pattern.
A: Write business data and outbox event in same DB transaction; after commit a worker reliably publishes the event to the queue. This avoids lost events when a service crashes between DB write and queue publish.

Q: How do you enforce multi-tenancy in a database?
A: Scope records by `companyId`, include the company constraint in every query, and verify claims in JWT and guards.

Q: Why use Prisma instead of raw SQL?
A: Prisma gives type-safe queries, reduces repetitive SQL, integrates with TypeScript, and manages migrations via a schema file.

---

**PART 9 — Exercises (Practice with Solutions Hints)**

Exercise 1 (Beginner - JSON/HTTP):
- Task: Create a small POST request body JSON to create a customer with name and email. Validate fields.
- Hint: Validate `email` contains `@` and `name` is non-empty.

Exercise 2 (Frontend - React):
- Task: Build a small React component that fetches `GET /customers` and lists names using fetch or TanStack Query.
- Files to inspect: `apps/web/src/lib/api` and `apps/web/src/components`.

Exercise 3 (Frontend - Form):
- Task: Create a form using React Hook Form and Zod that posts to `POST /invoices`.

Exercise 4 (Backend - Idempotency):
- Task: Implement or inspect idempotency check in `apps/api/src/shared/idempotency`. Add a test that replays the same request twice and asserts a single DB record.

Exercise 5 (Backend - Outbox):
- Task: Walk through the outbox pattern in `apps/api/src/modules/automation` and write a small worker test that publishes a pending outbox event.

Exercise 6 (Domain - Accounting):
- Task: Read `apps/api/src/modules/accounting` and trace how a posted invoice creates two journal lines (debit/credit). Write a small unit test that verifies totals balance.

Solutions: For each exercise, the repository contains spec files under `apps/api/*.spec.ts`. Use those tests as templates — run `pnpm --filter ./apps/api test` and adapt.

---

**PART 10 — Prioritized Reading List (Start → Deep Dive)**
1. `README.md`
2. `SYSTEM_ARCHITECTURE.md`
3. `BUSINESS_WORKFLOWS.md`
4. `DATABASE_DESIGN.md`
5. `API_OVERVIEW.md`
6. `apps/api/src/modules/auth` and `apps/api/src/modules/payments`
7. `packages/database/prisma/schema.prisma`
8. `apps/web/src/app/layout.tsx` and `apps/web/src/lib/api`

---

## Next steps I can do for you
- Expand any section into deeper sub-sections with examples.
- Add runnable exercise solutions in `study/solutions/` and unit-test verification.
- Generate a printable PDF of this guide.

If you want, I will now: 1) run quick link checks and 2) add an exercises solutions folder with complete solutions and tests. Which should I do next?

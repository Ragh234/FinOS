# Contributing

Thanks for your interest in FinOS. This project is a finance-grade SaaS application, so contributions should preserve tenant isolation, financial correctness, auditability, and a professional ERP user experience.

## Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL
- Redis
- Git

## Local Setup

```bash
pnpm install
pnpm --filter @finos/database prisma:generate
pnpm --filter @finos/database prisma:migrate
pnpm --filter @finos/database prisma:seed
pnpm --filter @finos/api dev
pnpm --filter @finos/web dev
```

## Repository Structure

```text
apps/
  api/      NestJS backend
  web/      Next.js frontend
packages/
  database/ Prisma schema, migrations, seed data
  tsconfig/ Shared TypeScript configuration
docs/       Supporting planning and implementation notes
```

## Development Principles

- Do not bypass tenant scoping
- Do not mutate posted financial history destructively
- Use transactions for financial writes
- Use idempotency keys for retry-sensitive mutations
- Keep audit logging on sensitive operations
- Keep background jobs idempotent
- Follow existing module boundaries
- Prefer small, focused pull requests

## Backend Guidelines

- Controllers should handle HTTP concerns
- Services should hold business logic
- Prisma access should be tenant-scoped
- DTOs should validate inputs
- Financial operations should use transactions
- Domain events should be written through the outbox
- New mutations should consider audit and idempotency requirements

## Frontend Guidelines

- Keep the UI ERP-style and information-dense
- Use TanStack Query for server state
- Use Zustand for local interface state
- Use React Hook Form and Zod for forms
- Include loading, empty, and error states
- Preserve table search, filtering, and pagination conventions
- Avoid marketing-style layouts inside the product app

## Testing

Run the relevant checks before opening a pull request:

```bash
pnpm --filter @finos/database prisma:validate
pnpm --filter @finos/api typecheck
pnpm --filter @finos/api test
pnpm --filter @finos/api build
pnpm --filter @finos/web typecheck
pnpm --filter @finos/web build
```

## Database Changes

Database changes require extra care.

- Explain why the schema change is required
- Include a migration
- Preserve existing tenant boundaries
- Consider indexes for new query patterns
- Avoid destructive migrations without a rollback strategy
- Update `DATABASE_DESIGN.md` when the domain model changes

## Pull Request Checklist

- Feature or fix is scoped and explained
- Tests were added or updated where appropriate
- Typecheck passes
- Build passes
- Prisma validation passes
- No tenant isolation regression
- No financial invariant regression
- Documentation updated when behavior changes

## Commit Style

Use concise commits:

```text
feat(api): add collection follow-up validation
fix(payments): prevent duplicate allocation retry
docs: update deployment checklist
test(inventory): cover concurrent stock decrement
```

## Review Focus

Reviewers should prioritize:

- Security
- Tenant isolation
- Financial consistency
- Race conditions
- Retry safety
- Auditability
- API consistency
- UI workflow clarity

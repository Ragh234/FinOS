# FinOS Initial Migration Strategy

The database design is frozen except for critical validation bugs. The initial migration should create the complete tenant-aware schema in one baseline migration, followed by a second hardening migration for PostgreSQL constraints that Prisma cannot express directly.

## Migration Order

1. `000001_initial_schema`
   - Create all enums.
   - Create identity, tenant, master data, transactional, banking, accounting, collection, credit intelligence, notification, activity, analytics, AI, export, and audit tables.
   - Create Prisma-declared foreign keys, unique constraints, and indexes.

2. `000002_financial_constraints`
   - Add journal-line check: not both debit and credit greater than zero.
   - Add journal-line check: debit and credit are non-negative.
   - Add money and quantity non-negative checks where negative values are not valid.
   - Add probability checks for model confidence and collection probability between 0 and 1.
   - Add valid date range checks for fiscal periods, reconciliation periods, and forecast runs.
   - Add locked reconciliation check requiring zero difference when `status = 'LOCKED'`.

3. `000003_reporting_indexes`
   - Add expression or GIN indexes only after real query patterns are known.
   - Candidate JSONB targets: product attributes, activity metadata, notification provider metadata, credit feature snapshots, executive metric dimensions.

## Operational Rules

- Run migrations through Prisma Migrate in CI and production release pipelines.
- Never edit an applied migration.
- Keep PostgreSQL-only constraints in SQL migration files committed beside Prisma-generated migrations.
- Verify every migration against a clean database and a production-like restored database before release.
- Large append-only tables should be partition candidates after usage data is available: `AuditLog`, `ActivityTimeline`, `JournalLine`, `StockMovement`, `BankStatementLine`, `NotificationDelivery`.

## Baseline Commands

```bash
pnpm install
pnpm db:generate
pnpm --filter @finos/database prisma migrate dev --name initial_schema
pnpm --filter @finos/database prisma validate
```

`pnpm` is required locally before these commands can run.

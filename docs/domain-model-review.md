# FinOS Domain Model Review

This review freezes the database direction before API and UI generation. The current schema has been expanded from a basic ERP/accounting core into a production-grade operating model that supports banking, reconciliation, notifications, activity timelines, collections, promise-to-pay tracking, executive dashboard metrics, and credit intelligence.

## Missing Entities Identified

### Banking

Required entities:

- `BankAccount`: tenant-owned bank, cash, card, wallet, loan, and other cash-equivalent accounts, optionally tied to a chart-of-accounts ledger account.
- `BankTransaction`: normalized bank feed or manually entered cash movement, linked to payments or journal entries when applicable.
- `BankStatementImport`: immutable source import batch with file hash for duplicate prevention.
- `BankStatementLine`: raw imported statement rows retained for traceability.

Why this matters:

- Payments are business events; bank transactions are bank evidence. They must be related, not collapsed into one table.
- Reconciliation requires both internal system transactions and external statement lines.

### Reconciliation

Required entities:

- `BankReconciliation`: reconciliation session for a bank account and period.
- `BankReconciliationMatch`: confirmed or suggested links between internal bank transactions and statement lines.

Why this matters:

- Reconciliation is a controlled accounting workflow, not a boolean flag.
- Completed reconciliations should be lockable and auditable.

### Notifications

Required entities:

- `NotificationTemplate`: tenant-defined message content per channel.
- `NotificationDelivery`: every queued, sent, delivered, failed, and read notification.

Why this matters:

- Collection reminders, invoice emails, payment receipts, password emails, and workflow alerts need delivery history and retry visibility.
- Provider message IDs and errors must be stored for support and compliance.

### Activity Timeline

Required entity:

- `ActivityTimeline`: normalized event stream across parties, invoices, payments, follow-ups, promises, bank reconciliation, and system events.

Why this matters:

- SMEs need a full account history: calls, emails, payment promises, status changes, task assignment, reminders, and system actions.
- Audit logs capture data mutation; activity timelines capture operational context.

### Collection Follow-Ups

Required entity:

- `CollectionFollowUp`: assigned collection tasks with due date, priority, channel, status, outcome, expected amount, and next follow-up time.

Why this matters:

- Collections are a workflow with ownership and outcomes, not merely an aging report.
- Follow-up outcomes feed credit intelligence and cashflow forecasts.

### Promise-to-Pay Tracking

Required entities:

- `PromiseToPay`: customer commitment with promised amount, promised date, status, reminder date, broken reason, and fulfillment state.
- `PromiseToPayAllocation`: links payments to promises, supporting partial fulfillment.

Why this matters:

- Promise behavior is one of the strongest predictors of collection probability and credit risk.
- Broken promises should affect customer risk and future credit recommendations.

### Executive Dashboard Metrics

Required entity:

- `ExecutiveMetricSnapshot`: periodized metrics such as revenue, collections, overdue exposure, gross margin, cash balance, inventory value, risk exposure, and forecasted cash.

Why this matters:

- Executive dashboards must be fast, stable, and explainable.
- Snapshots preserve historical metric values even if source data changes through corrections or late postings.

## Definitive Schema Decisions

- Every tenant-owned model has `companyId`.
- Core tenant-owned models now have explicit `Company` relations, not just a loose tenant id.
- Business documents are separated from invoices:
  - `BusinessDocument` covers quotations, sales orders, purchase orders, goods receipts, delivery challans, credit notes, and debit notes.
  - `Invoice` remains the financial receivable/payable document.
- Banking is separate from payments:
  - `Payment` captures money movement against parties and invoices.
  - `BankTransaction` captures bank evidence and reconciliation status.
- Collections are workflow records:
  - `CollectionFollowUp` tracks task ownership and outcome.
  - `PromiseToPay` tracks customer commitments and fulfillment.
- Dashboard metrics are stored as snapshots:
  - Source-of-truth reports still derive from ledger, inventory ledger, bank transactions, and receivables/payables.
  - Snapshots are used for dashboard performance and historical executive views.
- Credit intelligence remains explainable and versioned:
  - Scores, recommendations, predictions, and forecasts store model versions, feature snapshots, confidence, and reasons.

## Financial Consistency Rules

These rules must be enforced by service transactions and reinforced with database migrations where Prisma cannot express check constraints.

- Money fields use `Decimal(18, 4)`.
- Quantities use `Decimal(18, 4)`.
- Percentages and probabilities use bounded decimals such as `Decimal(5, 4)` or `Decimal(8, 4)`.
- Posted journal entries are immutable.
- Journal entries must balance: sum of debit equals sum of credit.
- A journal line cannot have both debit and credit greater than zero.
- Posted payments must create journal entries.
- Bank transactions must not be marked `RECONCILED` without a confirmed reconciliation match.
- Completed reconciliations should have zero difference before locking.
- Stock movements are append-only and update stock balances inside a single database transaction.
- Invoices are voided or adjusted by credit/debit notes; posted financial documents are not hard-deleted.
- Payment allocations cannot exceed the payment amount or the open invoice amount.
- Promise-to-pay allocations cannot exceed the promised amount.
- Credit-limit recommendations cannot update approved credit limits without an explicit user decision.
- Dashboard metric snapshots must reference a deterministic metric key and period.
- All mutations must write `AuditLog`; operational events should also write `ActivityTimeline`.

## Production Migration Notes

Prisma models define relationships, indexes, uniqueness, and tenant ownership. Production migrations should add PostgreSQL-level checks for:

- Non-negative amounts where required.
- Probability between 0 and 1.
- Journal debit/credit exclusivity at line level.
- Reconciliation difference equals zero when locked.
- Valid date ranges such as period start before period end.
- Optional partial unique indexes, such as one default credit policy per company.

The final schema is located at `packages/database/prisma/schema.prisma`.

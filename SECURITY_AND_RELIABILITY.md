# Security and Reliability

FinOS is built around financial correctness, tenant isolation, auditable operations, and retry-safe processing. This document explains the controls that make the platform suitable for production SaaS use.

## RBAC

Role-based access control ensures users can only perform actions allowed by their company role.

Why it exists:

- Finance systems contain sensitive customer, payment, banking, and accounting data
- Operational staff may need collections access without admin privileges
- Admin actions must be separated from daily transaction processing

Protected areas include customers, products, inventory, sales, payments, banking, collections, credit intelligence, automation, and administration.

## Tenant Isolation

`companyId` is the tenant boundary. Business records are created, queried, updated, and deleted within the active company context.

Why it exists:

- A SaaS user may belong to multiple companies
- Customer, invoice, payment, and banking data must never leak across tenants
- Background jobs and notifications must operate on the correct company scope

Tenant isolation is enforced through authenticated company membership and service-level query scoping.

## Audit Logging

Audit logs capture sensitive and financial operations with user, company, action, entity, and metadata context.

Why it exists:

- Finance teams need traceability
- Reversals, payment allocations, and banking actions require accountability
- Security reviews need a record of important user actions

Audited activity includes authentication events, financial mutations, reversals, collection actions, credit refreshes, and administrative changes.

## Transactional Outbox

The transactional outbox stores domain events in PostgreSQL inside the same transaction as the business change.

Why it exists:

- Database writes and queue publication cannot be made atomic through direct queue calls
- A crash after a database commit but before queue publish would otherwise lose automation
- A crash after queue publish could otherwise duplicate work

Outbox events move through:

- `PENDING`
- `PROCESSING`
- `PROCESSED`
- `FAILED`

Workers poll pending events, publish to BullMQ, and mark events processed only after successful publication.

## Idempotency Keys

Idempotency keys protect financial mutation endpoints from duplicate requests.

Why it exists:

- Browsers, proxies, and clients can retry requests
- Users may double-click submit buttons
- Network timeouts can leave clients uncertain whether an operation succeeded

Protected operations include invoice creation, payment creation, invoice reversal, payment reversal, promise creation, and collection follow-up creation.

Rules:

- Same key plus same request returns the original response
- Same key plus different request is rejected
- Keys are scoped by company and endpoint

## Concurrency Protection

Critical financial operations are protected with database transactions and safe update patterns.

Protected areas:

- Payment allocation
- Inventory stock decrement
- Document number generation
- Promise allocation and fulfillment
- Invoice and payment reversal

Why it exists:

- Two users may allocate the same payment at the same time
- Two sales may reduce the same inventory balance
- Concurrent document creation may request the same number
- Concurrent reversal attempts must not create duplicate reversing entries

The system preserves invariants such as no negative stock, no over-allocation, no duplicate document numbers, and one successful reversal per document.

## Reversal Framework

Financial reversals are explicit compensating operations.

Why it exists:

- Accounting history should not be destructively edited
- Reversal actions need audit visibility
- Journal entries and stock movements must remain traceable

Reversals create reversing journal entries and reversing stock movements where applicable.

## Notification Reliability

Notifications use templates, delivery records, provider abstractions, and retry-aware background jobs.

Why it exists:

- Customer reminders and internal alerts must survive transient provider failures
- Email and WhatsApp providers may change independently
- Delivery status needs to be auditable

Notification types include overdue invoice reminders, promise due reminders, broken promise alerts, credit limit warnings, and collection follow-up reminders.

## Authentication Hardening

Authentication protects against common account lifecycle and token risks.

Controls:

- Only active users can authenticate
- Pending, suspended, and disabled users cannot log in
- Verification and reset tokens are stored hashed
- Token secrets are environment-managed
- Refresh token rotation is atomic and single-use

## Background Job Safety

Background jobs are tenant-scoped, retry-safe, and designed for idempotent processing.

Job metadata includes:

- `jobId`
- `correlationId`
- `companyId`

This supports operational tracing across API requests, outbox events, queue jobs, and worker execution.

## Operational Reliability Checklist

- Use managed PostgreSQL with backups and point-in-time recovery
- Use managed Redis with persistence appropriate for queue workloads
- Rotate production secrets regularly
- Monitor queue failures and outbox backlog
- Alert on failed financial jobs
- Validate migrations before deployment
- Run typecheck, tests, build, and Prisma validation in CI

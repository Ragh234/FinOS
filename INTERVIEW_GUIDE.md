# Interview Guide

This guide summarizes the engineering decisions behind FinOS and provides interview-ready answers for architecture, backend reliability, database design, and product thinking.

## Architecture Decisions

FinOS uses a modular SaaS architecture because SME finance workflows span multiple domains: sales, inventory, accounting, payments, collections, banking, credit intelligence, automation, and AI CFO insights. The system keeps these domains separated while preserving shared controls for tenant isolation, RBAC, audit logging, transactions, outbox events, and idempotency.

## Why NestJS

NestJS was chosen because it provides a strong modular architecture, dependency injection, guards, interceptors, DTO validation, testability, and a clean way to organize enterprise backend services. This matches FinOS because finance systems need clear boundaries and predictable request handling.

## Why Prisma

Prisma was chosen for type-safe database access, schema visibility, migration support, and developer productivity. It helps keep database queries explicit and consistent while still allowing transaction-based business logic for financial operations.

## Why PostgreSQL

PostgreSQL was chosen because FinOS needs relational integrity, transactions, indexing, constraints, JSON support where useful, and mature operational tooling. Financial systems benefit from ACID guarantees and strong query capabilities.

## Why BullMQ

BullMQ was chosen for reliable Redis-backed background processing, retries, delayed jobs, worker separation, and operational visibility. FinOS uses it for automation such as notifications, credit refreshes, promise breach detection, dashboard refreshes, and outbox event handling.

## Why the Outbox Pattern

The outbox pattern was implemented because database writes and queue publication are not naturally atomic. By storing domain events in PostgreSQL inside the same transaction as the business change, FinOS avoids lost events during crashes and makes background automation durable.

## Why Idempotency Keys

Idempotency keys were implemented because financial APIs must survive duplicate requests, client retries, network timeouts, and double submissions. They prevent duplicate invoices, payments, promises, follow-ups, and reversals.

## Major Engineering Challenges

- Preserving accounting invariants across invoices, payments, and reversals
- Preventing concurrent payment over-allocation
- Preventing negative inventory under concurrent sales
- Generating document numbers without duplicates
- Making background automation retry-safe
- Keeping tenant isolation consistent across modules and workers
- Building AI CFO responses grounded only in available business data

## Concurrency Problems Solved

- Two concurrent payment allocations cannot over-allocate the same payment or invoice
- Two concurrent inventory decrements cannot create negative stock
- Two concurrent document creations cannot produce duplicate document numbers
- Two concurrent promise allocations cannot over-fulfill a promise
- Two concurrent reversals cannot both succeed

## Financial Consistency Guarantees

- Financial writes are transactional
- Journal entries remain balanced
- Posted history is reversed through compensating entries
- Payment allocations are bounded by available balances
- Inventory movements preserve stock traceability
- Idempotency prevents duplicate financial operations
- Audit logs preserve accountability

## 30 Interview Questions and Ideal Answers

### 1. What is FinOS?

FinOS is a multi-tenant Financial Operating System for SMEs. It combines ERP workflows, accounting, collections, credit intelligence, banking reconciliation, notifications, dashboards, and AI CFO insights in one SaaS platform.

### 2. What problem does it solve?

It reduces fragmented finance operations. SMEs often use spreadsheets, accounting tools, manual follow-ups, and disconnected bank records. FinOS centralizes those workflows with stronger controls and visibility.

### 3. Why did you use a modular architecture?

Finance domains have different rules but share common controls. A modular architecture keeps sales, payments, inventory, accounting, collections, and banking maintainable while reusing tenant isolation, RBAC, audit, and reliability patterns.

### 4. How is multi-tenancy implemented?

Company is the tenant boundary. Tenant-owned records include `companyId`, and authenticated users access data through company membership and roles. Services scope queries and mutations to the active company.

### 5. How do you prevent cross-tenant data leaks?

Every business query includes company context, and controllers/services derive that company from the authenticated request. Background jobs also carry company context so asynchronous work remains tenant-scoped.

### 6. How does RBAC work?

Users are assigned roles within a company. Guards enforce whether the current user can access a controller action or business operation.

### 7. Why is audit logging important?

Finance systems need accountability. Audit logs record who performed sensitive actions, which company was affected, which entity changed, and relevant metadata.

### 8. How are invoices posted?

Invoice posting transitions an invoice into a financially active state, creates accounting entries, and may trigger inventory movements depending on the product and sales flow.

### 9. How do payment allocations work?

Payments can be allocated to invoices through transactional logic that checks available payment amount and invoice outstanding balance before creating allocations.

### 10. How do you prevent payment over-allocation?

The allocation logic runs in a database transaction and uses safe update patterns so concurrent requests cannot allocate more than the available amount.

### 11. How do you prevent negative inventory?

Stock decrements validate available balance inside a transaction and use conditional updates so concurrent decrements cannot reduce quantity below zero.

### 12. How do reversals work?

Reversals are explicit compensating actions. They create reversing journal entries and reversing stock movements where applicable instead of deleting financial history.

### 13. Why not just delete a wrong invoice?

Deleting posted financial records destroys auditability. Reversals preserve the original transaction and create a traceable correction.

### 14. What is the transactional outbox?

It is a database table that stores domain events inside the same transaction as the business write. Workers later publish those events to queues.

### 15. What failure does the outbox prevent?

It prevents losing events when the database commit succeeds but the queue publish fails or the API crashes before publishing.

### 16. What are idempotency keys?

They are client-provided keys that make mutation APIs safe to retry. Same key and same payload returns the same response. Same key and different payload is rejected.

### 17. Which APIs need idempotency most?

Financial mutation APIs: invoice creation, payment creation, reversals, promise creation, and collection follow-up creation.

### 18. Why did you choose PostgreSQL?

PostgreSQL provides transactions, relational integrity, indexing, constraints, and operational maturity, all of which are important for financial systems.

### 19. Why did you choose Prisma?

Prisma gives type-safe database access, migration support, and clear schema modeling, while still supporting transactional service logic.

### 20. Why did you choose BullMQ?

BullMQ provides Redis-backed queues, retries, delayed jobs, and worker processing, which are useful for notifications, automation, and outbox processing.

### 21. How does the notification system work?

Notification templates define message content. Delivery records track in-app, email, or WhatsApp notifications. Workers dispatch notifications through provider abstractions and update delivery status.

### 22. How does credit intelligence work?

It uses operational data such as receivables, payment history, promises, credit limits, and exposure to refresh customer credit profiles and risk scores.

### 23. How does AI CFO avoid hallucinations?

AI CFO responses are grounded in existing business data and should explain only what can be supported by retrieved financial records and computed metrics.

### 24. How is the frontend structured?

The frontend uses Next.js routes, reusable ERP components, TanStack Query for server state, Zustand for UI state, and form validation through React Hook Form and Zod.

### 25. Why TanStack Query?

It manages server state, caching, loading states, retries, invalidation, and background refreshes cleanly for data-heavy screens.

### 26. Why Zustand?

Zustand is lightweight and appropriate for local UI state such as filters, panel state, selected rows, and workspace preferences.

### 27. What makes the UI ERP-style?

It is desktop-first, dense, table-driven, workflow-oriented, and optimized for repeated business operations instead of marketing presentation.

### 28. What would you monitor in production?

API errors, auth failures, database latency, slow queries, queue failures, outbox backlog, failed notifications, worker crashes, and financial operation failure rates.

### 29. What are the most important tests?

Concurrency tests, financial invariant tests, tenant isolation tests, idempotency tests, reversal tests, auth tests, and integration tests against PostgreSQL.

### 30. What would you improve next?

After v1.0, I would improve observability, add more report exports, harden operational dashboards, expand provider integrations, and add more granular permission templates.

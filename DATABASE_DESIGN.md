# Database Design

FinOS uses PostgreSQL as the financial system of record and Prisma as the typed data access layer. The schema is organized around tenant-owned business records, double-entry accounting, inventory movements, collections, banking reconciliation, credit intelligence, automation, and auditability.

## Design Principles

- Every tenant-owned entity is scoped by `companyId`
- Financial mutations are transactional
- Accounting uses journal entries and journal lines
- Inventory changes are represented as movements
- Payments and reversals preserve traceability
- Outbox events and idempotency keys support reliable distributed processing
- Audit logs capture sensitive and financial activity

## Core Entity Map

```mermaid
erDiagram
  Company ||--o{ UserCompanyRole : has
  User ||--o{ UserCompanyRole : belongs_to
  Company ||--o{ Customer : owns
  Company ||--o{ Product : owns
  Company ||--o{ Invoice : owns
  Company ||--o{ Payment : owns
  Company ||--o{ JournalEntry : owns
  Company ||--o{ BankAccount : owns
  Company ||--o{ CollectionFollowUp : owns
  Company ||--o{ CreditProfile : owns
  Company ||--o{ AuditLog : owns
```

## Multi-Tenancy Model

`Company` is the tenant boundary. Users gain access through company role membership. Business queries include the active `companyId`, which prevents cross-company data access.

Core tenant-scoped entities include:

- Customers
- Products
- Inventory locations, balances, and movements
- Invoices and invoice lines
- Payments and allocations
- Bank accounts and bank transactions
- Journal entries and journal lines
- Collection follow-ups
- Promises to pay
- Credit profiles and risk records
- Notification templates and deliveries
- Audit logs
- Outbox events
- Idempotency keys

## Accounting Model

FinOS uses a double-entry accounting model.

```mermaid
erDiagram
  Company ||--o{ Account : owns
  Company ||--o{ JournalEntry : owns
  JournalEntry ||--|{ JournalLine : contains
  Account ||--o{ JournalLine : receives
  Invoice ||--o{ JournalEntry : posts
  Payment ||--o{ JournalEntry : posts
```

Important accounting rules:

- Posted financial documents create journal entries
- Journal entries contain balanced debit and credit lines
- Reversals create reversing journal entries instead of mutating history destructively
- Payment allocations affect receivable balances through controlled transactions

## Sales and Payments Model

```mermaid
erDiagram
  Customer ||--o{ Invoice : receives
  Invoice ||--|{ InvoiceLine : contains
  Product ||--o{ InvoiceLine : sold_as
  Customer ||--o{ Payment : makes
  Payment ||--o{ PaymentAllocation : allocates
  Invoice ||--o{ PaymentAllocation : receives
```

Sales and payment records preserve:

- Invoice lifecycle state
- Payment lifecycle state
- Allocation history
- Reversal linkage
- Document numbers
- Tenant and audit context

## Inventory Model

```mermaid
erDiagram
  Product ||--o{ InventoryBalance : has
  InventoryLocation ||--o{ InventoryBalance : stores
  Product ||--o{ InventoryMovement : moves
  InventoryLocation ||--o{ InventoryMovement : source_or_target
  InvoiceLine ||--o{ InventoryMovement : triggers
```

Inventory is managed through balances and stock movements. Sales can create stock decrements. Reversals create compensating stock movements where applicable.

Key invariants:

- Stock balances cannot go negative
- Movements are traceable to business source documents
- Inventory updates are tenant-scoped and transactionally protected

## Collections Model

```mermaid
erDiagram
  Customer ||--o{ CollectionFollowUp : has
  Invoice ||--o{ CollectionFollowUp : relates_to
  Customer ||--o{ PromiseToPay : makes
  Invoice ||--o{ PromiseToPay : promised_for
  PaymentAllocation ||--o{ PromiseToPay : fulfills
```

Collections includes:

- Follow-up records
- Promise-to-pay lifecycle
- Automatic fulfillment detection
- Breach detection
- Promise reliability metrics
- Collection dashboard aggregates

## Banking Model

```mermaid
erDiagram
  Company ||--o{ BankAccount : owns
  BankAccount ||--o{ BankTransaction : contains
  BankTransaction ||--o{ BankReconciliation : reconciles
  Payment ||--o{ BankReconciliation : matches
```

Banking supports:

- Bank accounts
- Imported or entered bank transactions
- Reconciliation status
- Cash position visibility
- Links between banking movements and payments

## Credit Intelligence Model

```mermaid
erDiagram
  Customer ||--o{ CreditProfile : has
  CreditProfile ||--o{ CreditSnapshot : records
  Customer ||--o{ RiskScore : assessed_by
  Customer ||--o{ CreditRecommendation : receives
```

Credit intelligence uses existing operational data to compute:

- Outstanding exposure
- Payment reliability
- Promise reliability
- Credit utilization
- Risk score
- Credit command center aggregates

## Reliability and Audit Entities

```mermaid
erDiagram
  Company ||--o{ OutboxEvent : owns
  Company ||--o{ IdempotencyKey : owns
  Company ||--o{ AuditLog : owns
  Company ||--o{ NotificationTemplate : owns
  Company ||--o{ NotificationDelivery : owns
```

`OutboxEvent` enables atomic event persistence. `IdempotencyKey` prevents duplicate financial operations. `AuditLog` records sensitive activity. Notification records preserve delivery status and retry metadata.

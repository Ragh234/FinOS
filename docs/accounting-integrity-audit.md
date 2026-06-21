# Accounting Integrity Audit

Scope: transactional foundation only. No schema redesign, no new product modules, no AI, no analytics, and no frontend work.

## Invariants

| ID | Invariant | Current Status | Automated Coverage |
|---|---|---|---|
| AI-001 | Every posted sales invoice creates a posted journal entry where total debit equals total credit. | Pass for sales posting path. | `accounting-integrity.spec.ts` |
| AI-002 | Every payment creates a posted journal entry where total debit equals total credit. | Pass for payment creation path. | `accounting-integrity.spec.ts` |
| AI-003 | Trial Balance always balances across posted journal lines. | Pass if all journal entries are created through `LedgerPostingService`; database-level check still belongs in SQL migration. | `accounting-integrity.spec.ts` |
| AI-004 | Balance Sheet satisfies assets = liabilities + equity after closing profit/loss to equity. | Partial. Current report exposes `check`; it balances only when income/expense have been closed or excluded from the equation. | `accounting-integrity.spec.ts` documents balanced closed-state behavior. |
| AI-005 | Partial payments create allocations, increment invoice `amountPaid`, decrement `amountDue`, and set `PARTIAL` until fully paid. | Pass. Manual allocations now validate tenant, party, invoice type, and open amount. | `accounting-integrity.spec.ts` |
| AI-006 | Voiding posted documents must create reversing journal entries instead of deleting transactions. | Gap. No void service exists for invoices/payments yet. | `it.todo` in `accounting-integrity.spec.ts` |
| AI-007 | Stock movements reconcile to inventory balances per company/product/location. | Pass for movements posted through `InventoryService.postMovement`. | `accounting-integrity.spec.ts` |
| AI-008 | Tenant isolation is enforced on all transactional services. | Pass at service-query level for sales, payments, inventory, products, customers; relies on global tenant guard at controller layer. | `accounting-integrity.spec.ts` |

## Findings

- `LedgerPostingService.post` rejects unbalanced entries before persistence and writes `JournalStatus.POSTED`.
- Sales posting uses `LedgerPostingService.salesInvoiceLines`, so invoice debit/credit construction is centralized.
- Payment creation uses `LedgerPostingService.paymentLines`, so payment debit/credit construction is centralized.
- Trial Balance is only as reliable as posted journal integrity. The service-level invariant is covered; PostgreSQL constraints should still enforce line-level debit/credit rules.
- Balance Sheet report currently reports `check = assets - liabilities - equity`. A live ERP usually needs retained earnings/current earnings treatment for unclosed periods. The invariant is true in a closed accounting state; the current report should not be represented as a finalized statutory balance sheet before closing entries exist.
- Voiding/reversal is not implemented. This is the only requested invariant that cannot pass today.
- Stock balance reconciliation is maintained transactionally by `InventoryService.postMovement`, which writes the stock movement and upserts the balance inside one transaction.
- Tenant isolation is explicit in transactional service queries using `companyId` and is reinforced by the global tenant guard.

## Required Future Tests When Void Methods Are Added

- Voiding a posted invoice creates a reversing journal entry with opposite debit/credit lines.
- Voiding a payment creates a reversing journal entry and reverses payment allocations.
- Voiding an inventory-affecting invoice creates reversing stock movements.
- Voided source documents remain queryable and are never hard-deleted.

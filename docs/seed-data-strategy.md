# FinOS Seed Data Strategy

Seed data must make a new tenant usable without creating fake business history. Production seed records are limited to system configuration and safe defaults.

## Global Seed Data

- Role permission matrix for Owner, Manager, Accountant, Sales Executive, and Inventory Manager.
- Default document sequence templates.
- Default chart of accounts template.
- Default notification templates for verification, reset password, invoice send, payment receipt, and collection reminder.

## Company Bootstrap Seed Data

When a company is created:

- Create the Owner membership for the creating user.
- Create the first fiscal period from `financialYearStart`.
- Create document sequences for invoices, payments, quotations, sales orders, purchase orders, journal entries, and bank reconciliations.
- Create a default credit policy.
- Create a default inventory location named `Main`.
- Create common units: PCS, KG, MTR, LTR, BOX, HRS.
- Create a zero-rate tax rate and leave all other tax setup user-controlled.
- Create system chart-of-accounts rows required by posting services:
  - Cash and Bank
  - Accounts Receivable
  - Accounts Payable
  - Sales Revenue
  - Purchase Expense
  - Inventory Asset
  - Cost of Goods Sold
  - Tax Payable
  - Discounts
  - Owner Equity

## Non-Goals

- Do not seed sample customers, suppliers, products, invoices, payments, or bank statements.
- Do not seed industry-specific products or categories.
- Do not seed artificial ledger activity.

## Idempotency

All seed operations must be idempotent using company-scoped unique keys such as account code, sequence type/year, unit code, tax name, and credit policy name.

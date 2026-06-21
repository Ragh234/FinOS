import { BadRequestException } from "@nestjs/common";
import { DocumentStatus, InvoiceType, PaymentDirection, StockMovementType } from "@finos/database";
import { AccountingReportsService } from "./accounting-reports.service";
import { LedgerPostingService } from "./ledger-posting.service";
import { InventoryService } from "../inventory/inventory.service";
import { PaymentsService } from "../payments/payments.service";
import { SalesService } from "../sales/sales.service";

function sumJournal(lines: Array<{ debit?: number; credit?: number }>) {
  return lines.reduce<{ debit: number; credit: number }>(
    (totals, line) => ({
      debit: totals.debit + Number(line.debit ?? 0),
      credit: totals.credit + Number(line.credit ?? 0)
    }),
    { debit: 0, credit: 0 }
  );
}

describe("Accounting integrity invariants", () => {
  it("AI-001: posted sales invoice journal lines are balanced", async () => {
    const tx = {
      account: {
        findMany: jest.fn().mockResolvedValue([
          { id: "ar", code: "1100" },
          { id: "sales", code: "4000" },
          { id: "tax", code: "2100" }
        ])
      },
      journalEntry: { create: jest.fn().mockResolvedValue({ id: "je_1" }) }
    };
    const ledger = new LedgerPostingService({ next: jest.fn().mockResolvedValue("JE-00001") } as never);
    const input = ledger.salesInvoiceLines("company_1", "invoice_1", "customer_1", 118, 18);

    await ledger.post(tx as never, { ...input, entryDate: new Date("2026-06-01") });

    const createdLines = tx.journalEntry.create.mock.calls[0][0].data.lines.create;
    expect(sumJournal(createdLines)).toEqual({ debit: 118, credit: 118 });
  });

  it("AI-002: payment journal lines are balanced", async () => {
    const tx = {
      account: {
        findMany: jest.fn().mockResolvedValue([
          { id: "cash", code: "1000" },
          { id: "ar", code: "1100" }
        ])
      },
      journalEntry: { create: jest.fn().mockResolvedValue({ id: "je_1" }) }
    };
    const ledger = new LedgerPostingService({ next: jest.fn().mockResolvedValue("JE-00001") } as never);

    await ledger.post(tx as never, {
      companyId: "company_1",
      entryDate: new Date("2026-06-01"),
      sourceType: "Payment",
      sourceId: "payment_1",
      lines: ledger.paymentLines(PaymentDirection.IN, "customer_1", 75)
    });

    const createdLines = tx.journalEntry.create.mock.calls[0][0].data.lines.create;
    expect(sumJournal(createdLines)).toEqual({ debit: 75, credit: 75 });
  });

  it("AI-003: trial balance totals debit and credit equally for balanced posted entries", async () => {
    const service = new AccountingReportsService({
      account: {
        findMany: jest.fn().mockResolvedValue([
          { id: "cash", code: "1000", name: "Cash", type: "ASSET", lines: [{ debit: 100, credit: 0 }] },
          { id: "sales", code: "4000", name: "Sales", type: "INCOME", lines: [{ debit: 0, credit: 100 }] }
        ])
      }
    } as never);

    const rows = await service.trialBalance("company_1");
    const totals = rows.reduce((sum, row) => ({ debit: sum.debit + row.debit, credit: sum.credit + row.credit }), { debit: 0, credit: 0 });

    expect(totals).toEqual({ debit: 100, credit: 100 });
  });

  it("AI-004: balance sheet balances in a closed-state account set", async () => {
    const service = new AccountingReportsService({
      account: {
        findMany: jest.fn().mockResolvedValue([
          { id: "cash", code: "1000", name: "Cash", type: "ASSET", lines: [{ debit: 100, credit: 0 }] },
          { id: "liability", code: "2000", name: "Payable", type: "LIABILITY", lines: [{ debit: 0, credit: 40 }] },
          { id: "equity", code: "3000", name: "Equity", type: "EQUITY", lines: [{ debit: 0, credit: 60 }] }
        ])
      }
    } as never);

    await expect(service.balanceSheet("company_1")).resolves.toEqual({ assets: 100, liabilities: 40, equity: 60, check: 0 });
  });

  it("AI-005: partial payment allocations update paid/due amounts and partial status", async () => {
    const tx = {
      payment: {
        create: jest.fn().mockResolvedValue({
          id: "payment_1",
          paymentDate: new Date("2026-06-01"),
          number: "PAY-00001",
          allocations: [{ invoiceId: "invoice_1", amount: 40 }]
        })
      },
      invoice: {
        findFirst: jest.fn().mockResolvedValue({ id: "invoice_1", total: 100, amountPaid: 0, amountDue: 100 }),
        findFirstOrThrow: jest.fn().mockResolvedValue({ id: "invoice_1", total: 100, amountPaid: 40, amountDue: 60 }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn()
      },
      account: {
        findMany: jest.fn().mockResolvedValue([
          { id: "cash", code: "1000" },
          { id: "ar", code: "1100" }
        ])
      },
      journalEntry: { create: jest.fn().mockResolvedValue({ id: "je_1" }) },
      documentSequence: {
        findFirst: jest.fn().mockResolvedValue({ id: "seq_1", prefix: "PAY", nextNumber: 1, padding: 5 }),
        update: jest.fn()
      },
      auditLog: { create: jest.fn() }
    };
    const prisma = {
      party: { findFirst: jest.fn().mockResolvedValue({ id: "customer_1", type: "CUSTOMER" }) },
      $transaction: jest.fn((callback) => callback(tx))
    };
    const service = new PaymentsService(
      prisma as never,
      {} as never,
      { next: jest.fn().mockResolvedValue("PAY-00001") } as never,
      new LedgerPostingService({ next: jest.fn().mockResolvedValue("JE-00001") } as never),
      { record: jest.fn() } as never
    );

    await service.create("company_1", "user_1", {
      partyId: "customer_1",
      direction: PaymentDirection.IN,
      paymentDate: "2026-06-01",
      amount: 40,
      method: "BANK",
      allocations: [{ invoiceId: "invoice_1", amount: 40 }]
    });

    expect(tx.invoice.update).toHaveBeenCalledWith({
      where: { id: "invoice_1" },
      data: { status: DocumentStatus.PARTIAL }
    });
    expect(tx.invoice.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ companyId: "company_1", id: "invoice_1", amountDue: { gte: 40 } }),
      data: { amountPaid: { increment: 40 }, amountDue: { decrement: 40 } }
    }));
  });

  it.todo("AI-006: voiding posted invoices creates reversing journal entries instead of deleting transactions");
  it.todo("AI-006: voiding posted payments creates reversing journal entries and allocation reversals");

  it("AI-007: stock movements reconcile to inventory balances", async () => {
    const tx = {
      product: { findFirst: jest.fn().mockResolvedValue({ id: "product_1" }) },
      inventoryLocation: { findFirst: jest.fn().mockResolvedValue({ id: "location_1" }) },
      stockMovement: { create: jest.fn().mockResolvedValue({ id: "movement_1", quantity: 5 }) },
      stockBalance: {
        findUnique: jest.fn().mockResolvedValue({ currentStock: 7 }),
        upsert: jest.fn()
      },
      auditLog: { create: jest.fn() }
    };
    const prisma = {
      product: tx.product,
      inventoryLocation: tx.inventoryLocation,
      $transaction: jest.fn((callback) => callback(tx))
    };
    const service = new InventoryService(prisma as never, {} as never, { record: jest.fn() } as never);

    await service.postMovement("company_1", "user_1", {
      productId: "product_1",
      locationId: "location_1",
      type: StockMovementType.ADJUSTMENT,
      quantity: 5
    });

    expect(tx.stockBalance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId_productId_locationId: { companyId: "company_1", productId: "product_1", locationId: "location_1" } },
        update: { currentStock: { increment: 5 } }
      })
    );
  });

  it("AI-007: negative stock reconciliation is rejected", async () => {
    const tx = {
      product: { findFirst: jest.fn().mockResolvedValue({ id: "product_1" }) },
      inventoryLocation: { findFirst: jest.fn().mockResolvedValue({ id: "location_1" }) },
      stockMovement: { create: jest.fn().mockResolvedValue({ id: "movement_1", quantity: -8 }) },
      stockBalance: {
        findUnique: jest.fn().mockResolvedValue({ currentStock: 3 }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        upsert: jest.fn()
      },
      auditLog: { create: jest.fn() }
    };
    const prisma = {
      product: tx.product,
      inventoryLocation: tx.inventoryLocation,
      $transaction: jest.fn((callback) => callback(tx))
    };
    const service = new InventoryService(prisma as never, {} as never, { record: jest.fn() } as never);

    await expect(
      service.postMovement("company_1", "user_1", {
        productId: "product_1",
        locationId: "location_1",
        type: StockMovementType.SALES_ISSUE,
        quantity: -8
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("AI-008: sales invoice creation validates customer and products inside the tenant", async () => {
    const prisma = {
      party: { findFirst: jest.fn().mockResolvedValue({ id: "customer_1" }) },
      company: { findUniqueOrThrow: jest.fn().mockResolvedValue({ currency: "INR" }) },
      product: { findMany: jest.fn().mockResolvedValue([{ id: "product_1" }]) },
      $transaction: jest.fn(async () => ({ id: "invoice_1" }))
    };
    const service = new SalesService(prisma as never, {} as never, {} as never, {} as never, {} as never, {} as never);

    await service.create("company_1", "user_1", {
      partyId: "customer_1",
      issueDate: "2026-06-01",
      lines: [{ productId: "product_1", description: "Item", quantity: 1, unitPrice: 10, discountAmount: 0, taxRate: 0 }]
    });

    expect(prisma.party.findFirst).toHaveBeenCalledWith({
      where: { id: "customer_1", companyId: "company_1", type: "CUSTOMER", deletedAt: null }
    });
    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: { companyId: "company_1", id: { in: ["product_1"] }, deletedAt: null }
    });
  });

  it("AI-008: payment creation validates party inside the tenant", async () => {
    const prisma = {
      party: { findFirst: jest.fn().mockResolvedValue(null) }
    };
    const service = new PaymentsService(prisma as never, {} as never, {} as never, {} as never, {} as never);

    await expect(
      service.create("company_1", "user_1", {
        partyId: "foreign_party",
        direction: PaymentDirection.IN,
        paymentDate: "2026-06-01",
        amount: 10,
        method: "BANK"
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.party.findFirst).toHaveBeenCalledWith({ where: { companyId: "company_1", id: "foreign_party", deletedAt: null } });
  });
});

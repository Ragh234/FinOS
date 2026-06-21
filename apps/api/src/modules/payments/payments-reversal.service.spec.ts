import { BadRequestException } from "@nestjs/common";
import { DocumentStatus, PaymentDirection, PaymentStatus } from "@finos/database";
import { PaymentsService } from "./payments.service";

describe("PaymentsService reversal", () => {
  it("voids payments, restores invoice amount due, and posts reversing journals", async () => {
    const payment = {
      id: "payment_1",
      companyId: "company_1",
      partyId: "party_1",
      status: PaymentStatus.POSTED,
      direction: PaymentDirection.IN,
      number: "PAY-1",
      notes: null,
      allocations: [
        {
          amount: 40,
          invoice: { id: "invoice_1", total: 100, amountPaid: 40, status: DocumentStatus.PAID }
        }
      ]
    };
    const tx = {
      invoice: { update: jest.fn() },
      promiseToPayAllocation: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn() },
      payment: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({ id: "payment_1", status: PaymentStatus.VOID })
      }
    };
    const prisma = {
      payment: { findFirst: jest.fn().mockResolvedValue(payment) },
      $transaction: jest.fn((callback) => callback(tx))
    };
    const repo = { find: jest.fn().mockResolvedValue(payment) };
    const ledger = { reverse: jest.fn().mockResolvedValue([{ id: "journal_reverse_1" }]) };
    const audit = { record: jest.fn() };
    const service = new PaymentsService(prisma as never, repo as never, {} as never, ledger as never, audit as never);

    await service.reverse("company_1", "user_1", "payment_1", "Mistake");

    expect(tx.invoice.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ amountPaid: 0, amountDue: 100, status: DocumentStatus.SENT }) }));
    expect(ledger.reverse).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ sourceType: "Payment", reversalSourceType: "PaymentReversal" }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: "VOID", entityType: "Payment" }), tx);
  });

  it("rejects reversal when another transaction already claimed the payment", async () => {
    const payment = {
      id: "payment_1",
      companyId: "company_1",
      partyId: "party_1",
      status: PaymentStatus.POSTED,
      number: "PAY-1",
      notes: null,
      allocations: []
    };
    const tx = {
      payment: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) }
    };
    const prisma = { $transaction: jest.fn((callback) => callback(tx)) };
    const repo = { find: jest.fn().mockResolvedValue(payment) };
    const service = new PaymentsService(prisma as never, repo as never, {} as never, {} as never, {} as never);

    await expect(service.reverse("company_1", "user_1", "payment_1")).rejects.toBeInstanceOf(BadRequestException);
  });
});

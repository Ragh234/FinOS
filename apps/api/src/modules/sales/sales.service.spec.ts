import { SalesService } from "./sales.service";

describe("SalesService", () => {
  it("calculates invoice totals while creating a draft sales invoice", async () => {
    const tx = {
      invoice: {
        create: jest.fn().mockResolvedValue({ id: "inv_1", subtotal: 200, discountTotal: 10, taxTotal: 19, total: 209, lines: [] })
      },
      documentSequence: {
        findFirst: jest.fn().mockResolvedValue({ id: "seq_1", prefix: "INV", nextNumber: 1, padding: 5 }),
        update: jest.fn()
      },
      auditLog: { create: jest.fn() }
    };
    const prisma = {
      party: { findFirst: jest.fn().mockResolvedValue({ id: "cust_1" }) },
      company: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "company_1", currency: "INR" }) },
      product: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((callback) => callback(tx))
    };
    const service = new SalesService(
      prisma as never,
      {} as never,
      { next: jest.fn().mockResolvedValue("INV-00001") } as never,
      {} as never,
      {} as never,
      { record: jest.fn() } as never
    );

    await service.create("company_1", "user_1", {
      partyId: "cust_1",
      issueDate: "2026-06-01",
      lines: [{ description: "Item", quantity: 2, unitPrice: 100, discountAmount: 10, taxRate: 10 }]
    });

    expect(tx.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ subtotal: 200, discountTotal: 10, taxTotal: 19, total: 209, amountDue: 209 })
      })
    );
  });
});

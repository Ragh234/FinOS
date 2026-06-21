import { BadRequestException } from "@nestjs/common";
import { PaymentDirection } from "@finos/database";
import { PaymentsService } from "./payments.service";

describe("PaymentsService", () => {
  it("auto-allocates incoming payments to oldest open sales invoices", async () => {
    const prisma = {
      invoice: {
        findMany: jest.fn().mockResolvedValue([
          { id: "inv_1", amountDue: 60 },
          { id: "inv_2", amountDue: 60 }
        ])
      }
    };
    const service = new PaymentsService(prisma as never, {} as never, {} as never, {} as never, {} as never);

    const allocations = await (service as unknown as { autoAllocate: Function }).autoAllocate("company_1", "cust_1", PaymentDirection.IN, 100);

    expect(allocations).toEqual([
      { invoiceId: "inv_1", amount: 60 },
      { invoiceId: "inv_2", amount: 40 }
    ]);
  });

  it("rejects payment allocation when the invoice conditional update loses a race", async () => {
    const tx = {
      payment: {
        create: jest.fn().mockResolvedValue({
          id: "payment_1",
          partyId: "customer_1",
          number: "PAY-00001",
          paymentDate: new Date("2026-06-01"),
          amount: 80,
          direction: PaymentDirection.IN,
          allocations: [{ id: "alloc_1", invoiceId: "invoice_1", amount: 80 }]
        })
      },
      invoice: {
        findFirst: jest.fn().mockResolvedValue({ id: "invoice_1", amountDue: 80, type: "SALES" }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 })
      }
    };
    const prisma = {
      party: { findFirst: jest.fn().mockResolvedValue({ id: "customer_1", type: "CUSTOMER" }) },
      $transaction: jest.fn((callback) => callback(tx))
    };
    const service = new PaymentsService(prisma as never, {} as never, { next: jest.fn().mockResolvedValue("PAY-00001") } as never, {} as never, {} as never);

    await expect(
      service.create("company_1", "user_1", {
        partyId: "customer_1",
        direction: PaymentDirection.IN,
        paymentDate: "2026-06-01",
        amount: 80,
        method: "BANK",
        allocations: [{ invoiceId: "invoice_1", amount: 80 }]
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

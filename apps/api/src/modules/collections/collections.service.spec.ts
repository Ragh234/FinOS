import { BadRequestException } from "@nestjs/common";
import { CollectionFollowUpStatus, PartyType, PaymentStatus, PromiseToPayStatus } from "@finos/database";
import { CollectionsService } from "./collections.service";

describe("CollectionsService", () => {
  it("creates tenant-scoped follow-ups and audit records", async () => {
    const prisma = {
      party: { findFirst: jest.fn().mockResolvedValue({ id: "party_1", type: PartyType.CUSTOMER }) },
      collectionFollowUp: { create: jest.fn().mockResolvedValue({ id: "follow_1", companyId: "company_1" }) }
    };
    const audit = { record: jest.fn() };
    const service = new CollectionsService(prisma as never, audit as never);

    await service.createFollowUp("company_1", "user_1", { partyId: "party_1", dueDate: "2026-06-10" });

    expect(prisma.collectionFollowUp.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ companyId: "company_1", partyId: "party_1" }) }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ companyId: "company_1", entityType: "CollectionFollowUp" }));
  });

  it("marks overdue unpaid promises as broken", async () => {
    const tx = {
      promiseToPay: {
        update: jest.fn().mockResolvedValue({ id: "promise_1", partyId: "party_1", status: PromiseToPayStatus.BROKEN, promisedAmount: 100, paidAmount: 20 })
      }
    };
    const prisma = {
      promiseToPay: {
        findMany: jest.fn().mockResolvedValue([
          { id: "promise_1", companyId: "company_1", paidAmount: 20, promisedAmount: 100 },
          { id: "promise_2", companyId: "company_1", paidAmount: 100, promisedAmount: 100 }
        ]),
        findFirst: jest.fn().mockResolvedValue({ id: "promise_1", status: PromiseToPayStatus.OPEN }),
        update: jest.fn().mockResolvedValue({ id: "promise_1", status: PromiseToPayStatus.BROKEN })
      },
      $transaction: jest.fn((callback) => callback(tx))
    };
    const audit = { record: jest.fn() };
    const service = new CollectionsService(prisma as never, audit as never);

    const result = await service.detectBreaches("company_1", "user_1", new Date("2026-06-11"));

    expect(result).toEqual({ breached: 1 });
    expect(tx.promiseToPay.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: PromiseToPayStatus.BROKEN }) }));
  });

  it("calculates promise reliability metrics", async () => {
    const prisma = {
      party: { findFirst: jest.fn().mockResolvedValue({ id: "party_1", type: PartyType.CUSTOMER }) },
      promiseToPay: {
        findMany: jest.fn().mockResolvedValue([
          { status: PromiseToPayStatus.FULFILLED, promisedAmount: 100, paidAmount: 100 },
          { status: PromiseToPayStatus.BROKEN, promisedAmount: 100, paidAmount: 25 }
        ])
      }
    };
    const service = new CollectionsService(prisma as never, {} as never);

    const result = await service.reliability("company_1", "party_1");

    expect(result.fulfillmentRate).toBe(0.5);
    expect(result.breachRate).toBe(0.5);
    expect(result.amountReliability).toBe(0.625);
  });

  it("rejects promise allocations that lose the conditional remaining-amount race", async () => {
    const tx = {
      promiseToPay: {
        findFirst: jest.fn().mockResolvedValue({ id: "promise_1", partyId: "party_1", status: PromiseToPayStatus.OPEN, promisedAmount: 100, allocations: [] }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 })
      },
      payment: { findFirst: jest.fn().mockResolvedValue({ id: "payment_1", status: PaymentStatus.POSTED, partyId: "party_1" }) },
      promiseToPayAllocation: { create: jest.fn().mockResolvedValue({ id: "alloc_1" }) }
    };
    const prisma = { $transaction: jest.fn((callback) => callback(tx)) };
    const service = new CollectionsService(prisma as never, { record: jest.fn() } as never);

    await expect(service.allocatePromisePayment("company_1", "user_1", "promise_1", { paymentId: "payment_1", amount: 75 })).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.promiseToPay.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ companyId: "company_1", id: "promise_1", paidAmount: { lte: 25 } }),
      data: { paidAmount: { increment: 75 } }
    }));
  });
});

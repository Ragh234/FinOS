import { DocumentStatus, InvoiceType, PartyType, PromiseToPayStatus, RiskLevel } from "@finos/database";
import { CreditIntelligenceService } from "./credit-intelligence.service";

describe("CreditIntelligenceService", () => {
  it("scores customers from exposure, overdue invoices, and broken promises", async () => {
    const prisma = {
      party: { findFirst: jest.fn().mockResolvedValue({ id: "party_1", type: PartyType.CUSTOMER, creditLimit: 1000 }) },
      invoice: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([
            { amountDue: 800, dueDate: new Date("2026-05-01") },
            { amountDue: 200, dueDate: new Date("2026-07-01") }
          ])
          .mockResolvedValueOnce([{ amountDue: 800 }, { amountDue: 200 }])
      },
      promiseToPay: {
        findMany: jest.fn().mockResolvedValue([
          { status: PromiseToPayStatus.BROKEN },
          { status: PromiseToPayStatus.FULFILLED }
        ])
      }
    };
    const service = new CreditIntelligenceService(prisma as never, {} as never);

    const result = await service.scoreCustomer("company_1", "party_1");

    expect(result.level).toBe(RiskLevel.HIGH);
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(prisma.invoice.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ companyId: "company_1", type: InvoiceType.SALES, status: { not: DocumentStatus.VOID } }) }));
  });
});


import { AccountingReportsService } from "./accounting-reports.service";

describe("AccountingReportsService", () => {
  it("builds a trial balance from posted journal lines", async () => {
    const prisma = {
      account: {
        findMany: jest.fn().mockResolvedValue([
          { id: "a1", code: "1000", name: "Cash", type: "ASSET", lines: [{ debit: 100, credit: 0 }] },
          { id: "a2", code: "4000", name: "Sales", type: "INCOME", lines: [{ debit: 0, credit: 100 }] }
        ])
      }
    };
    const service = new AccountingReportsService(prisma as never);

    await expect(service.trialBalance("company_1")).resolves.toEqual([
      expect.objectContaining({ code: "1000", debit: 100, credit: 0, balance: 100 }),
      expect.objectContaining({ code: "4000", debit: 0, credit: 100, balance: -100 })
    ]);
  });
});

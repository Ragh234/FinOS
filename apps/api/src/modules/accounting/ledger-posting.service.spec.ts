import { BadRequestException } from "@nestjs/common";
import { LedgerPostingService } from "./ledger-posting.service";

describe("LedgerPostingService", () => {
  const numbers = { next: jest.fn().mockResolvedValue("JE-00001") };
  const service = new LedgerPostingService(numbers as never);

  it("rejects unbalanced journal entries", async () => {
    const tx = {
      account: { findMany: jest.fn() },
      journalEntry: { create: jest.fn() }
    };

    await expect(
      service.post(tx as never, {
        companyId: "company_1",
        entryDate: new Date(),
        sourceType: "Test",
        sourceId: "source_1",
        lines: [
          { accountCode: "1000", debit: 100 },
          { accountCode: "4000", credit: 90 }
        ]
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("creates a posted balanced journal entry", async () => {
    const tx = {
      account: {
        findMany: jest.fn().mockResolvedValue([
          { id: "cash", code: "1000" },
          { id: "sales", code: "4000" }
        ])
      },
      journalEntry: { create: jest.fn().mockResolvedValue({ id: "je_1" }) }
    };

    await service.post(tx as never, {
      companyId: "company_1",
      entryDate: new Date("2026-06-01"),
      sourceType: "Test",
      sourceId: "source_1",
      lines: [
        { accountCode: "1000", debit: 100 },
        { accountCode: "4000", credit: 100 }
      ]
    });

    expect(tx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "POSTED", number: "JE-00001" })
      })
    );
  });
});

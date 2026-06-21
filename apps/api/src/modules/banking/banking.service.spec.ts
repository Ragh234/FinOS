import { BadRequestException } from "@nestjs/common";
import { BankAccountType, BankTransactionType } from "@finos/database";
import { BankingService } from "./banking.service";

describe("BankingService", () => {
  it("creates tenant-scoped bank accounts and audit records", async () => {
    const prisma = {
      bankAccount: {
        create: jest.fn().mockResolvedValue({ id: "bank_1", companyId: "company_1" })
      }
    };
    const audit = { record: jest.fn() };
    const service = new BankingService(prisma as never, {} as never, audit as never);

    await service.createAccount("company_1", "user_1", {
      name: "Main Current",
      accountType: BankAccountType.CURRENT,
      openingBalance: 2500
    });

    expect(prisma.bankAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ companyId: "company_1", currentBalance: 2500 }) })
    );
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ companyId: "company_1", entityType: "BankAccount" }));
  });

  it("rejects double-sided bank transactions", async () => {
    const service = new BankingService({} as never, {} as never, {} as never);

    await expect(
      service.createTransaction("company_1", "user_1", {
        bankAccountId: "bank_1",
        type: BankTransactionType.DEPOSIT,
        transactionDate: "2026-06-04",
        description: "Invalid",
        debitAmount: 10,
        creditAmount: 20
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../shared/prisma/prisma.service";

@Injectable()
export class BankingRepository {
  constructor(private readonly prisma: PrismaService) {}

  listAccounts(companyId: string) {
    return this.prisma.bankAccount.findMany({
      where: { companyId },
      include: { ledgerAccount: true },
      orderBy: [{ isActive: "desc" }, { name: "asc" }]
    });
  }

  findAccount(companyId: string, id: string) {
    return this.prisma.bankAccount.findFirst({ where: { companyId, id }, include: { ledgerAccount: true } });
  }

  listTransactions(companyId: string, bankAccountId?: string) {
    return this.prisma.bankTransaction.findMany({
      where: { companyId, ...(bankAccountId ? { bankAccountId } : {}) },
      include: { bankAccount: true, payment: true, journalEntry: true },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      take: 200
    });
  }

  listReconciliations(companyId: string, bankAccountId?: string) {
    return this.prisma.bankReconciliation.findMany({
      where: { companyId, ...(bankAccountId ? { bankAccountId } : {}) },
      include: { bankAccount: true, matches: true },
      orderBy: { periodEnd: "desc" },
      take: 100
    });
  }

  findReconciliation(companyId: string, id: string) {
    return this.prisma.bankReconciliation.findFirst({
      where: { companyId, id },
      include: {
        bankAccount: true,
        matches: { include: { bankTransaction: true, statementLine: true } }
      }
    });
  }
}

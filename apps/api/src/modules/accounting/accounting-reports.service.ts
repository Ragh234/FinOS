import { Injectable } from "@nestjs/common";
import { AccountType } from "@finos/database";
import { PrismaService } from "../../shared/prisma/prisma.service";

@Injectable()
export class AccountingReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async generalLedger(companyId: string, accountId?: string) {
    return this.prisma.journalLine.findMany({
      where: { companyId, accountId, journalEntry: { status: "POSTED" } },
      include: { account: true, journalEntry: true },
      orderBy: [{ journalEntry: { entryDate: "asc" } }]
    });
  }

  async trialBalance(companyId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { companyId, isActive: true },
      include: { lines: { where: { journalEntry: { status: "POSTED" } } } },
      orderBy: { code: "asc" }
    });
    return accounts.map((account) => {
      const debit = account.lines.reduce((sum, line) => sum + Number(line.debit), 0);
      const credit = account.lines.reduce((sum, line) => sum + Number(line.credit), 0);
      return { accountId: account.id, code: account.code, name: account.name, type: account.type, debit, credit, balance: debit - credit };
    });
  }

  async profitAndLoss(companyId: string) {
    const rows = await this.trialBalance(companyId);
    const income = rows.filter((row) => row.type === AccountType.INCOME).reduce((sum, row) => sum + Math.abs(row.balance), 0);
    const expenses = rows.filter((row) => row.type === AccountType.EXPENSE).reduce((sum, row) => sum + Math.abs(row.balance), 0);
    return { income, expenses, netProfit: income - expenses };
  }

  async balanceSheet(companyId: string) {
    const rows = await this.trialBalance(companyId);
    const assets = rows.filter((row) => row.type === AccountType.ASSET).reduce((sum, row) => sum + row.balance, 0);
    const liabilities = rows.filter((row) => row.type === AccountType.LIABILITY).reduce((sum, row) => sum + Math.abs(row.balance), 0);
    const equity = rows.filter((row) => row.type === AccountType.EQUITY).reduce((sum, row) => sum + Math.abs(row.balance), 0);
    return { assets, liabilities, equity, check: assets - liabilities - equity };
  }
}

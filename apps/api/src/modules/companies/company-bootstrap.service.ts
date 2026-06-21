import { Injectable } from "@nestjs/common";
import { AccountType, NormalBalance, Prisma } from "@finos/database";
import { PrismaService } from "../../shared/prisma/prisma.service";

const defaultUnits = [
  ["PCS", "Pieces", 0],
  ["KG", "Kilograms", 3],
  ["MTR", "Meters", 3],
  ["LTR", "Liters", 3],
  ["BOX", "Box", 0],
  ["HRS", "Hours", 2]
] as const;

const defaultAccounts = [
  ["1000", "Cash and Bank", AccountType.ASSET, NormalBalance.DEBIT],
  ["1100", "Accounts Receivable", AccountType.ASSET, NormalBalance.DEBIT],
  ["1200", "Inventory Asset", AccountType.ASSET, NormalBalance.DEBIT],
  ["2000", "Accounts Payable", AccountType.LIABILITY, NormalBalance.CREDIT],
  ["2100", "Tax Payable", AccountType.LIABILITY, NormalBalance.CREDIT],
  ["3000", "Owner Equity", AccountType.EQUITY, NormalBalance.CREDIT],
  ["4000", "Sales Revenue", AccountType.INCOME, NormalBalance.CREDIT],
  ["5000", "Purchase Expense", AccountType.EXPENSE, NormalBalance.DEBIT],
  ["5100", "Cost of Goods Sold", AccountType.EXPENSE, NormalBalance.DEBIT],
  ["5200", "Discounts", AccountType.EXPENSE, NormalBalance.DEBIT]
] as const;

const defaultSequences = [
  ["SALES_INVOICE", "INV"],
  ["PURCHASE_INVOICE", "BILL"],
  ["PAYMENT", "PAY"],
  ["QUOTATION", "QT"],
  ["SALES_ORDER", "SO"],
  ["PURCHASE_ORDER", "PO"],
  ["JOURNAL_ENTRY", "JE"],
  ["BANK_RECONCILIATION", "BR"]
] as const;

@Injectable()
export class CompanyBootstrapService {
  constructor(private readonly prisma: PrismaService) {}

  async bootstrap(tx: Prisma.TransactionClient, companyId: string, financialYearStart: Date) {
    const financialYear = financialYearStart.getFullYear().toString();
    const fiscalEnd = new Date(financialYearStart);
    fiscalEnd.setFullYear(fiscalEnd.getFullYear() + 1);
    fiscalEnd.setDate(fiscalEnd.getDate() - 1);

    await tx.fiscalPeriod.create({
      data: {
        companyId,
        name: financialYear,
        startDate: financialYearStart,
        endDate: fiscalEnd
      }
    });

    await tx.creditPolicy.create({
      data: {
        companyId,
        name: "Default",
        isDefault: true
      }
    });

    await tx.inventoryLocation.create({
      data: {
        companyId,
        name: "Main",
        code: "MAIN"
      }
    });

    await tx.taxRate.create({
      data: {
        companyId,
        name: "Zero Rated",
        rate: "0"
      }
    });

    await tx.unit.createMany({
      data: defaultUnits.map(([code, name, precision]) => ({ companyId, code, name, precision }))
    });

    await tx.account.createMany({
      data: defaultAccounts.map(([code, name, type, normalBalance]) => ({
        companyId,
        code,
        name,
        type,
        normalBalance,
        isSystem: true
      }))
    });

    await tx.documentSequence.createMany({
      data: defaultSequences.map(([documentType, prefix]) => ({
        companyId,
        documentType,
        prefix,
        financialYear
      }))
    });
  }
}

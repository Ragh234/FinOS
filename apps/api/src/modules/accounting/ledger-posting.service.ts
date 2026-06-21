import { BadRequestException, Injectable } from "@nestjs/common";
import { InvoiceType, JournalStatus, PaymentDirection, Prisma } from "@finos/database";
import { DocumentNumberService } from "../../shared/sequences/document-number.service";

type LedgerLineInput = {
  accountCode: string;
  debit?: number;
  credit?: number;
  partyId?: string;
  productId?: string;
  memo?: string;
};

@Injectable()
export class LedgerPostingService {
  constructor(private readonly numbers: DocumentNumberService) {}

  async post(tx: Prisma.TransactionClient, input: {
    companyId: string;
    entryDate: Date;
    memo?: string;
    sourceType: string;
    sourceId: string;
    invoiceId?: string;
    paymentId?: string;
    lines: LedgerLineInput[];
  }) {
    const debit = input.lines.reduce((sum, line) => sum + (line.debit ?? 0), 0);
    const credit = input.lines.reduce((sum, line) => sum + (line.credit ?? 0), 0);
    if (Math.round(debit * 10000) !== Math.round(credit * 10000)) {
      throw new BadRequestException("Journal entry is not balanced");
    }

    const accounts = await tx.account.findMany({
      where: { companyId: input.companyId, code: { in: input.lines.map((line) => line.accountCode) }, isActive: true }
    });
    const accountByCode = new Map(accounts.map((account) => [account.code, account]));
    for (const line of input.lines) {
      if (!accountByCode.has(line.accountCode)) {
        throw new BadRequestException(`Missing account ${line.accountCode}`);
      }
      if ((line.debit ?? 0) > 0 && (line.credit ?? 0) > 0) {
        throw new BadRequestException("A journal line cannot contain both debit and credit");
      }
    }

    return tx.journalEntry.create({
      data: {
        companyId: input.companyId,
        status: JournalStatus.POSTED,
        number: await this.numbers.next(tx, input.companyId, "JOURNAL_ENTRY"),
        entryDate: input.entryDate,
        memo: input.memo,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        invoiceId: input.invoiceId,
        paymentId: input.paymentId,
        postedAt: new Date(),
        lines: {
          create: input.lines.map((line) => ({
            companyId: input.companyId,
            accountId: accountByCode.get(line.accountCode)!.id,
            debit: line.debit ?? 0,
            credit: line.credit ?? 0,
            partyId: line.partyId,
            productId: line.productId,
            memo: line.memo
          }))
        }
      },
      include: { lines: true }
    });
  }

  salesInvoiceLines(companyId: string, invoiceId: string, partyId: string, total: number, taxTotal: number) {
    return {
      companyId,
      sourceType: "SalesInvoice",
      sourceId: invoiceId,
      invoiceId,
      lines: [
        { accountCode: "1100", debit: total, partyId, memo: "Accounts receivable" },
        { accountCode: "4000", credit: total - taxTotal, partyId, memo: "Sales revenue" },
        ...(taxTotal > 0 ? [{ accountCode: "2100", credit: taxTotal, partyId, memo: "Tax payable" }] : [])
      ]
    };
  }

  paymentLines(direction: PaymentDirection, partyId: string, amount: number) {
    if (direction === PaymentDirection.IN) {
      return [
        { accountCode: "1000", debit: amount, partyId, memo: "Payment received" },
        { accountCode: "1100", credit: amount, partyId, memo: "Accounts receivable settlement" }
      ];
    }
    return [
      { accountCode: "2000", debit: amount, partyId, memo: "Accounts payable settlement" },
      { accountCode: "1000", credit: amount, partyId, memo: "Payment made" }
    ];
  }

  async reverse(tx: Prisma.TransactionClient, input: {
    companyId: string;
    sourceType: string;
    sourceId: string;
    reversalSourceType: string;
    reversalSourceId: string;
    entryDate: Date;
    memo?: string;
    invoiceId?: string;
    paymentId?: string;
  }) {
    const entries = await tx.journalEntry.findMany({
      where: {
        companyId: input.companyId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        status: JournalStatus.POSTED
      },
      include: { lines: { include: { account: true } } }
    });
    if (!entries.length) return [];
    const reversals = [];
    for (const entry of entries) {
      reversals.push(await this.post(tx, {
        companyId: input.companyId,
        sourceType: input.reversalSourceType,
        sourceId: input.reversalSourceId,
        invoiceId: input.invoiceId,
        paymentId: input.paymentId,
        entryDate: input.entryDate,
        memo: input.memo ?? `Reversal of ${entry.number}`,
        lines: entry.lines.map((line) => ({
          accountCode: line.account.code,
          debit: Number(line.credit),
          credit: Number(line.debit),
          partyId: line.partyId ?? undefined,
          productId: line.productId ?? undefined,
          memo: `Reversal: ${line.memo ?? entry.memo ?? entry.number}`
        }))
      }));
    }
    return reversals;
  }
}

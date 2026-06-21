import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AuditAction,
  BankTransactionStatus,
  Prisma,
  ReconciliationMatchStatus,
  ReconciliationStatus
} from "@finos/database";
import { AuditService } from "../../shared/audit/audit.service";
import { PrismaService } from "../../shared/prisma/prisma.service";
import {
  CreateBankAccountDto,
  CreateBankTransactionDto,
  CreateReconciliationDto,
  ImportStatementDto,
  MatchReconciliationDto,
  UpdateReconciliationMatchDto
} from "./dto/banking.dto";
import { BankingRepository } from "./banking.repository";

@Injectable()
export class BankingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: BankingRepository,
    private readonly audit: AuditService
  ) {}

  listAccounts(companyId: string) {
    return this.repo.listAccounts(companyId);
  }

  async getAccount(companyId: string, id: string) {
    const account = await this.repo.findAccount(companyId, id);
    if (!account) throw new NotFoundException("Bank account not found");
    return account;
  }

  async createAccount(companyId: string, actorUserId: string, dto: CreateBankAccountDto) {
    if (dto.ledgerAccountId) {
      const ledgerAccount = await this.prisma.account.findFirst({ where: { companyId, id: dto.ledgerAccountId, isActive: true } });
      if (!ledgerAccount) throw new BadRequestException("Ledger account does not belong to this company");
    }

    const account = await this.prisma.bankAccount.create({
      data: {
        companyId,
        ledgerAccountId: dto.ledgerAccountId,
        name: dto.name,
        accountType: dto.accountType,
        institutionName: dto.institutionName,
        accountNumberMasked: dto.accountNumberMasked,
        ifscOrRoutingCode: dto.ifscOrRoutingCode,
        currency: dto.currency ?? "INR",
        openingBalance: dto.openingBalance,
        currentBalance: dto.openingBalance,
        statementBalance: dto.openingBalance
      }
    });

    await this.audit.record({ companyId, actorUserId, action: AuditAction.CREATE, entityType: "BankAccount", entityId: account.id, after: account });
    return account;
  }

  listTransactions(companyId: string, bankAccountId?: string) {
    return this.repo.listTransactions(companyId, bankAccountId);
  }

  async createTransaction(companyId: string, actorUserId: string, dto: CreateBankTransactionDto) {
    this.assertSingleSidedAmount(dto.debitAmount, dto.creditAmount);
    await this.assertBankAccount(companyId, dto.bankAccountId);

    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.bankTransaction.create({
        data: {
          companyId,
          bankAccountId: dto.bankAccountId,
          type: dto.type,
          status: BankTransactionStatus.CATEGORIZED,
          transactionDate: new Date(dto.transactionDate),
          valueDate: dto.valueDate ? new Date(dto.valueDate) : undefined,
          description: dto.description,
          reference: dto.reference,
          debitAmount: dto.debitAmount,
          creditAmount: dto.creditAmount,
          runningBalance: dto.runningBalance,
          counterpartyName: dto.counterpartyName,
          externalId: dto.externalId,
          metadata: this.toJson(dto.metadata)
        }
      });

      await tx.bankAccount.update({
        where: { id: dto.bankAccountId },
        data: { currentBalance: { increment: dto.creditAmount - dto.debitAmount }, lastSyncedAt: new Date() }
      });
      await this.audit.record({ companyId, actorUserId, action: AuditAction.CREATE, entityType: "BankTransaction", entityId: transaction.id, after: transaction }, tx);
      return transaction;
    });
  }

  async importStatement(companyId: string, actorUserId: string, dto: ImportStatementDto) {
    if (!dto.lines.length) throw new BadRequestException("Statement import requires at least one line");
    await this.assertBankAccount(companyId, dto.bankAccountId);
    for (const line of dto.lines) this.assertSingleSidedAmount(line.debitAmount, line.creditAmount);

    return this.prisma.$transaction(async (tx) => {
      const statementImport = await tx.bankStatementImport.create({
        data: {
          companyId,
          bankAccountId: dto.bankAccountId,
          fileName: dto.fileName,
          fileHash: dto.fileHash,
          source: dto.source,
          importedBy: actorUserId,
          metadata: this.toJson(dto.metadata),
          lines: {
            create: dto.lines.map((line) => ({
              companyId,
              bankAccountId: dto.bankAccountId,
              lineNumber: line.lineNumber,
              transactionDate: new Date(line.transactionDate),
              valueDate: line.valueDate ? new Date(line.valueDate) : undefined,
              description: line.description,
              reference: line.reference,
              debitAmount: line.debitAmount,
              creditAmount: line.creditAmount,
              balance: line.balance,
              raw: this.toJson(line.raw)
            }))
          }
        },
        include: { lines: true }
      });

      let latestBalance: number | undefined;
      for (let index = dto.lines.length - 1; index >= 0; index -= 1) {
        const line = dto.lines[index];
        if (line?.balance !== undefined) {
          latestBalance = line.balance;
          break;
        }
      }
      if (latestBalance !== undefined) {
        await tx.bankAccount.update({ where: { id: dto.bankAccountId }, data: { statementBalance: latestBalance, lastSyncedAt: new Date() } });
      }
      await this.audit.record({ companyId, actorUserId, action: AuditAction.CREATE, entityType: "BankStatementImport", entityId: statementImport.id, after: statementImport }, tx);
      return statementImport;
    });
  }

  listReconciliations(companyId: string, bankAccountId?: string) {
    return this.repo.listReconciliations(companyId, bankAccountId);
  }

  async getReconciliation(companyId: string, id: string) {
    const reconciliation = await this.repo.findReconciliation(companyId, id);
    if (!reconciliation) throw new NotFoundException("Bank reconciliation not found");
    return reconciliation;
  }

  async createReconciliation(companyId: string, actorUserId: string, dto: CreateReconciliationDto) {
    await this.assertBankAccount(companyId, dto.bankAccountId);
    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);
    if (periodStart >= periodEnd) throw new BadRequestException("Reconciliation period start must be before end");

    const totals = await this.transactionTotals(companyId, dto.bankAccountId, periodStart, periodEnd);
    const systemClosingBalance = totals.opening + totals.netMovement;
    const difference = dto.statementClosingBalance - systemClosingBalance;
    const reconciliation = await this.prisma.bankReconciliation.create({
      data: {
        companyId,
        bankAccountId: dto.bankAccountId,
        periodStart,
        periodEnd,
        statementOpeningBalance: dto.statementOpeningBalance,
        statementClosingBalance: dto.statementClosingBalance,
        systemOpeningBalance: totals.opening,
        systemClosingBalance,
        difference,
        preparedBy: actorUserId,
        notes: dto.notes
      }
    });

    await this.audit.record({ companyId, actorUserId, action: AuditAction.CREATE, entityType: "BankReconciliation", entityId: reconciliation.id, after: reconciliation });
    return reconciliation;
  }

  async createMatch(companyId: string, actorUserId: string, reconciliationId: string, dto: MatchReconciliationDto) {
    if (!dto.bankTransactionId && !dto.statementLineId) throw new BadRequestException("A match requires a bank transaction or statement line");
    const reconciliation = await this.getReconciliation(companyId, reconciliationId);
    if (reconciliation.status === ReconciliationStatus.LOCKED) throw new BadRequestException("Locked reconciliations cannot be changed");
    await this.assertMatchSources(companyId, reconciliation.bankAccountId, dto.bankTransactionId, dto.statementLineId);

    const match = await this.prisma.bankReconciliationMatch.create({
      data: {
        companyId,
        reconciliationId,
        bankTransactionId: dto.bankTransactionId,
        statementLineId: dto.statementLineId,
        matchedAmount: dto.matchedAmount,
        matchScore: dto.matchScore,
        status: ReconciliationMatchStatus.SUGGESTED
      }
    });
    await this.audit.record({ companyId, actorUserId, action: AuditAction.CREATE, entityType: "BankReconciliationMatch", entityId: match.id, after: match });
    return match;
  }

  async updateMatch(companyId: string, actorUserId: string, matchId: string, dto: UpdateReconciliationMatchDto) {
    const existing = await this.prisma.bankReconciliationMatch.findFirst({ where: { companyId, id: matchId }, include: { reconciliation: true } });
    if (!existing) throw new NotFoundException("Reconciliation match not found");
    if (existing.reconciliation.status === ReconciliationStatus.LOCKED) throw new BadRequestException("Locked reconciliations cannot be changed");
    if (dto.status === ReconciliationMatchStatus.REJECTED && !dto.rejectedReason) throw new BadRequestException("Rejected matches require a reason");

    return this.prisma.$transaction(async (tx) => {
      const match = await tx.bankReconciliationMatch.update({
        where: { id: matchId },
        data: {
          status: dto.status,
          rejectedReason: dto.rejectedReason,
          matchedBy: dto.status === ReconciliationMatchStatus.CONFIRMED ? actorUserId : existing.matchedBy,
          matchedAt: dto.status === ReconciliationMatchStatus.CONFIRMED ? new Date() : existing.matchedAt
        }
      });
      if (existing.bankTransactionId) {
        await tx.bankTransaction.update({
          where: { id: existing.bankTransactionId },
          data: { status: dto.status === ReconciliationMatchStatus.CONFIRMED ? BankTransactionStatus.RECONCILED : BankTransactionStatus.CATEGORIZED }
        });
      }
      await this.audit.record({ companyId, actorUserId, action: AuditAction.UPDATE, entityType: "BankReconciliationMatch", entityId: match.id, before: existing, after: match }, tx);
      return match;
    });
  }

  async completeReconciliation(companyId: string, actorUserId: string, id: string) {
    const reconciliation = await this.getReconciliation(companyId, id);
    if (Number(reconciliation.difference) !== 0) throw new BadRequestException("Only zero-difference reconciliations can be completed");
    const completed = await this.prisma.bankReconciliation.update({
      where: { id },
      data: { status: ReconciliationStatus.COMPLETED, reviewedBy: actorUserId, completedAt: new Date() }
    });
    await this.audit.record({ companyId, actorUserId, action: AuditAction.UPDATE, entityType: "BankReconciliation", entityId: id, before: reconciliation, after: completed });
    return completed;
  }

  private assertSingleSidedAmount(debitAmount = 0, creditAmount = 0) {
    if (debitAmount <= 0 && creditAmount <= 0) throw new BadRequestException("Debit or credit amount is required");
    if (debitAmount > 0 && creditAmount > 0) throw new BadRequestException("A bank transaction line cannot have both debit and credit amounts");
  }

  private async assertBankAccount(companyId: string, bankAccountId: string) {
    const account = await this.prisma.bankAccount.findFirst({ where: { companyId, id: bankAccountId, isActive: true } });
    if (!account) throw new BadRequestException("Bank account does not belong to this company");
    return account;
  }

  private async assertMatchSources(companyId: string, bankAccountId: string, bankTransactionId?: string, statementLineId?: string) {
    if (bankTransactionId) {
      const transaction = await this.prisma.bankTransaction.findFirst({ where: { companyId, bankAccountId, id: bankTransactionId } });
      if (!transaction) throw new BadRequestException("Bank transaction does not belong to this reconciliation account");
    }
    if (statementLineId) {
      const line = await this.prisma.bankStatementLine.findFirst({ where: { companyId, bankAccountId, id: statementLineId } });
      if (!line) throw new BadRequestException("Statement line does not belong to this reconciliation account");
    }
  }

  private async transactionTotals(companyId: string, bankAccountId: string, periodStart: Date, periodEnd: Date) {
    const account = await this.assertBankAccount(companyId, bankAccountId);
    const movements = await this.prisma.bankTransaction.aggregate({
      where: { companyId, bankAccountId, transactionDate: { gte: periodStart, lte: periodEnd } },
      _sum: { debitAmount: true, creditAmount: true }
    });
    const netMovement = Number(movements._sum.creditAmount ?? 0) - Number(movements._sum.debitAmount ?? 0);
    return { opening: Number(account.openingBalance), netMovement };
  }

  private toJson(value: Record<string, unknown> | undefined) {
    return value === undefined ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
  }
}

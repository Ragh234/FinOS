import { BadRequestException, Injectable, Optional } from "@nestjs/common";
import { AuditAction, CollectionFollowUpStatus, DocumentStatus, InvoiceType, PartyType, PromiseToPayStatus, RiskLevel } from "@finos/database";
import { AuditService } from "../../shared/audit/audit.service";
import { makeEvent } from "../../shared/events/domain-events";
import { DomainEventsService } from "../../shared/events/domain-events.service";
import { PrismaService } from "../../shared/prisma/prisma.service";

type RiskScoreResult = {
  partyId: string;
  score: number;
  level: RiskLevel;
  drivers: Record<string, number | string>;
};

@Injectable()
export class CreditIntelligenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Optional() private readonly events?: DomainEventsService
  ) {}

  async overview(companyId: string) {
    const now = new Date();
    const [profiles, receivables, overdue, pendingFollowUps, brokenPromises] = await Promise.all([
      this.prisma.creditProfile.findMany({ where: { companyId } }),
      this.prisma.invoice.aggregate({ where: { companyId, type: InvoiceType.SALES, status: { not: DocumentStatus.VOID }, amountDue: { gt: 0 } }, _sum: { amountDue: true }, _count: true }),
      this.prisma.invoice.aggregate({ where: { companyId, type: InvoiceType.SALES, status: { not: DocumentStatus.VOID }, dueDate: { lt: now }, amountDue: { gt: 0 } }, _sum: { amountDue: true }, _count: true }),
      this.prisma.collectionFollowUp.count({ where: { companyId, status: { in: [CollectionFollowUpStatus.OPEN, CollectionFollowUpStatus.IN_PROGRESS] } } }),
      this.prisma.promiseToPay.count({ where: { companyId, status: PromiseToPayStatus.BROKEN } })
    ]);
    return {
      totalReceivableExposure: Number(receivables._sum.amountDue ?? 0),
      openInvoiceCount: receivables._count,
      overdueExposure: Number(overdue._sum.amountDue ?? 0),
      overdueInvoiceCount: overdue._count,
      pendingFollowUps,
      brokenPromises,
      riskDistribution: {
        low: profiles.filter((profile) => profile.riskLevel === RiskLevel.LOW).length,
        medium: profiles.filter((profile) => profile.riskLevel === RiskLevel.MEDIUM).length,
        high: profiles.filter((profile) => profile.riskLevel === RiskLevel.HIGH).length
      },
      topRiskCustomers: profiles
        .sort((left, right) => right.riskScore - left.riskScore)
        .slice(0, 10)
    };
  }

  async refreshProfile(companyId: string, actorUserId: string, partyId: string) {
    const party = await this.assertCustomer(companyId, partyId);
    const now = new Date();
    const [openInvoices, promises, risk] = await Promise.all([
      this.prisma.invoice.findMany({ where: { companyId, partyId, type: InvoiceType.SALES, status: { not: DocumentStatus.VOID }, amountDue: { gt: 0 } } }),
      this.prisma.promiseToPay.findMany({ where: { companyId, partyId } }),
      this.scoreCustomer(companyId, partyId)
    ]);
    const currentExposure = openInvoices.reduce((sum, invoice) => sum + Number(invoice.amountDue), 0);
    const overdueExposure = openInvoices.filter((invoice) => invoice.dueDate && invoice.dueDate < now).reduce((sum, invoice) => sum + Number(invoice.amountDue), 0);
    const approvedCreditLimit = Number(party.creditLimit);
    const utilizationPercent = approvedCreditLimit > 0 ? (currentExposure / approvedCreditLimit) * 100 : 0;
    const brokenPromiseCount = promises.filter((promise) => promise.status === PromiseToPayStatus.BROKEN).length;
    const creditHold = risk.level === RiskLevel.HIGH || utilizationPercent > 100;
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.creditProfile.upsert({
        where: { companyId_partyId: { companyId, partyId } },
        create: {
          companyId,
          partyId,
          approvedCreditLimit,
          currentExposure,
          overdueExposure,
          utilizationPercent,
          brokenPromiseCount,
          riskScore: risk.score,
          riskLevel: risk.level,
          lastScoredAt: new Date(),
          creditHold,
          creditHoldReason: creditHold ? "High risk score or credit utilization above approved limit" : undefined
        },
        update: {
          approvedCreditLimit,
          currentExposure,
          overdueExposure,
          utilizationPercent,
          brokenPromiseCount,
          riskScore: risk.score,
          riskLevel: risk.level,
          lastScoredAt: new Date(),
          creditHold,
          creditHoldReason: creditHold ? "High risk score or credit utilization above approved limit" : null
        }
      });
      await this.audit.record({ companyId, actorUserId, action: AuditAction.UPDATE, entityType: "CreditProfile", entityId: profile.id, after: profile }, tx);
      if (creditHold || utilizationPercent > 100) {
        await this.events?.publish(makeEvent({
          name: "CreditLimitExceeded",
          companyId,
          actorUserId,
          entityType: "CreditProfile",
          entityId: profile.id,
          payload: { partyId, customerName: party.name, utilizationPercent, currentExposure, approvedCreditLimit }
        }), tx);
      }
      return profile;
    });
  }

  async scoreCustomer(companyId: string, partyId: string): Promise<RiskScoreResult> {
    const party = await this.assertCustomer(companyId, partyId);
    const now = new Date();
    const [openInvoices, allInvoices, promises] = await Promise.all([
      this.prisma.invoice.findMany({ where: { companyId, partyId, type: InvoiceType.SALES, status: { not: DocumentStatus.VOID }, amountDue: { gt: 0 } } }),
      this.prisma.invoice.findMany({ where: { companyId, partyId, type: InvoiceType.SALES, status: { not: DocumentStatus.VOID } } }),
      this.prisma.promiseToPay.findMany({ where: { companyId, partyId } })
    ]);
    const currentExposure = openInvoices.reduce((sum, invoice) => sum + Number(invoice.amountDue), 0);
    const overdueExposure = openInvoices.filter((invoice) => invoice.dueDate && invoice.dueDate < now).reduce((sum, invoice) => sum + Number(invoice.amountDue), 0);
    const utilization = Number(party.creditLimit) > 0 ? currentExposure / Number(party.creditLimit) : currentExposure > 0 ? 1 : 0;
    const overdueRatio = currentExposure > 0 ? overdueExposure / currentExposure : 0;
    const brokenRatio = promises.length ? promises.filter((promise) => promise.status === PromiseToPayStatus.BROKEN).length / promises.length : 0;
    const paymentCompletionRatio = allInvoices.length ? allInvoices.filter((invoice) => Number(invoice.amountDue) <= 0).length / allInvoices.length : 1;
    const score = Math.min(100, Math.round(overdueRatio * 40 + Math.min(utilization, 2) * 25 + brokenRatio * 25 + (1 - paymentCompletionRatio) * 10));
    const level = score >= 70 ? RiskLevel.HIGH : score >= 35 ? RiskLevel.MEDIUM : RiskLevel.LOW;
    return {
      partyId,
      score,
      level,
      drivers: {
        currentExposure,
        overdueExposure,
        utilizationPercent: Math.round(utilization * 10000) / 100,
        brokenPromiseRate: Math.round(brokenRatio * 10000) / 100,
        paymentCompletionRate: Math.round(paymentCompletionRatio * 10000) / 100
      }
    };
  }

  async recomputeScore(companyId: string, actorUserId: string, partyId: string) {
    const risk = await this.scoreCustomer(companyId, partyId);
    const snapshot = await this.prisma.$transaction(async (tx) => {
      const created = await tx.customerRiskSnapshot.create({
        data: {
          companyId,
          partyId,
          score: risk.score,
          level: risk.level,
          outstandingRatio: Number(risk.drivers.utilizationPercent) / 100,
          reasons: risk.drivers
        }
      });
      await tx.party.update({ where: { id: partyId }, data: { riskScore: risk.score, riskLevel: risk.level } });
      await this.audit.record({ companyId, actorUserId, action: AuditAction.UPDATE, entityType: "CustomerRiskSnapshot", entityId: created.id, after: created }, tx);
      await this.events?.publish(makeEvent({
        name: "RiskScoreUpdated",
        companyId,
        actorUserId,
        entityType: "CustomerRiskSnapshot",
        entityId: created.id,
        payload: { partyId, score: risk.score, level: risk.level, ...risk.drivers }
      }), tx);
      return created;
    });
    await this.refreshProfile(companyId, actorUserId, partyId);
    return { ...risk, snapshotId: snapshot.id };
  }

  async customers(companyId: string) {
    return this.prisma.creditProfile.findMany({ where: { companyId }, include: { party: true }, orderBy: [{ riskScore: "desc" }, { currentExposure: "desc" }] });
  }

  private async assertCustomer(companyId: string, partyId: string) {
    const party = await this.prisma.party.findFirst({ where: { companyId, id: partyId, type: PartyType.CUSTOMER, deletedAt: null } });
    if (!party) throw new BadRequestException("Customer does not belong to this company");
    return party;
  }
}

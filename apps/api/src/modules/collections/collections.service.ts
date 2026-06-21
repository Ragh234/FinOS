import { BadRequestException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import {
  AuditAction,
  CollectionFollowUpStatus,
  DocumentStatus,
  InvoiceType,
  PartyType,
  PaymentStatus,
  Prisma,
  PromiseToPayStatus
} from "@finos/database";
import { AuditService } from "../../shared/audit/audit.service";
import { makeEvent } from "../../shared/events/domain-events";
import { DomainEventsService } from "../../shared/events/domain-events.service";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { AllocatePromisePaymentDto, CreateFollowUpDto, CreatePromiseDto, UpdateFollowUpDto, UpdatePromiseDto } from "./dto/collections.dto";

@Injectable()
export class CollectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Optional() private readonly events?: DomainEventsService
  ) {}

  listFollowUps(companyId: string) {
    return this.prisma.collectionFollowUp.findMany({
      where: { companyId },
      include: { party: true, invoice: true, assignedTo: true },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      take: 200
    });
  }

  async getFollowUp(companyId: string, id: string) {
    const followUp = await this.prisma.collectionFollowUp.findFirst({ where: { companyId, id }, include: { party: true, invoice: true, assignedTo: true } });
    if (!followUp) throw new NotFoundException("Collection follow-up not found");
    return followUp;
  }

  async createFollowUp(companyId: string, actorUserId: string, dto: CreateFollowUpDto) {
    await this.assertCustomer(companyId, dto.partyId);
    if (dto.invoiceId) await this.assertCustomerInvoice(companyId, dto.partyId, dto.invoiceId);
    if (dto.assignedToId) await this.assertActiveMembership(companyId, dto.assignedToId);

    const followUp = await this.prisma.collectionFollowUp.create({
      data: {
        companyId,
        partyId: dto.partyId,
        invoiceId: dto.invoiceId,
        assignedToId: dto.assignedToId,
        dueDate: new Date(dto.dueDate),
        priority: dto.priority ?? 3,
        expectedAmount: dto.expectedAmount ?? 0,
        channel: dto.channel,
        notes: dto.notes
      }
    });
    await this.audit.record({ companyId, actorUserId, action: AuditAction.CREATE, entityType: "CollectionFollowUp", entityId: followUp.id, after: followUp });
    return followUp;
  }

  async updateFollowUp(companyId: string, actorUserId: string, id: string, dto: UpdateFollowUpDto) {
    const before = await this.getFollowUp(companyId, id);
    if (dto.assignedToId) await this.assertActiveMembership(companyId, dto.assignedToId);
    const status = dto.status ?? before.status;
    const followUp = await this.prisma.collectionFollowUp.update({
      where: { id },
      data: {
        assignedToId: dto.assignedToId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        priority: dto.priority,
        expectedAmount: dto.expectedAmount,
        status,
        outcome: dto.outcome,
        channel: dto.channel,
        notes: dto.notes,
        nextFollowUpAt: dto.nextFollowUpAt ? new Date(dto.nextFollowUpAt) : undefined,
        completedAt: status === CollectionFollowUpStatus.COMPLETED ? new Date() : undefined
      }
    });
    await this.audit.record({ companyId, actorUserId, action: AuditAction.UPDATE, entityType: "CollectionFollowUp", entityId: id, before, after: followUp });
    return followUp;
  }

  cancelFollowUp(companyId: string, actorUserId: string, id: string) {
    return this.updateFollowUp(companyId, actorUserId, id, { status: CollectionFollowUpStatus.CANCELLED });
  }

  listPromises(companyId: string, partyId?: string) {
    return this.prisma.promiseToPay.findMany({
      where: { companyId, ...(partyId ? { partyId } : {}) },
      include: { party: true, invoice: true, allocations: { include: { payment: true } } },
      orderBy: [{ status: "asc" }, { promisedDate: "asc" }],
      take: 200
    });
  }

  async getPromise(companyId: string, id: string) {
    const promise = await this.prisma.promiseToPay.findFirst({
      where: { companyId, id },
      include: { party: true, invoice: true, allocations: { include: { payment: true } } }
    });
    if (!promise) throw new NotFoundException("Promise to pay not found");
    return promise;
  }

  async createPromise(companyId: string, actorUserId: string, dto: CreatePromiseDto) {
    await this.assertCustomer(companyId, dto.partyId);
    if (dto.invoiceId) await this.assertCustomerInvoice(companyId, dto.partyId, dto.invoiceId);
    if (dto.sourceFollowUpId) await this.getFollowUp(companyId, dto.sourceFollowUpId);

    return this.prisma.$transaction(async (tx) => {
      const promise = await tx.promiseToPay.create({
        data: {
          companyId,
          partyId: dto.partyId,
          invoiceId: dto.invoiceId,
          sourceFollowUpId: dto.sourceFollowUpId,
          createdByUserId: actorUserId,
          promisedAmount: dto.promisedAmount,
          promisedDate: new Date(dto.promisedDate),
          reminderDate: dto.reminderDate ? new Date(dto.reminderDate) : undefined,
          notes: dto.notes
        }
      });
      await this.audit.record({ companyId, actorUserId, action: AuditAction.CREATE, entityType: "PromiseToPay", entityId: promise.id, after: promise }, tx);
      await this.events?.publish(makeEvent({
        name: "PromiseCreated",
        companyId,
        actorUserId,
        entityType: "PromiseToPay",
        entityId: promise.id,
        payload: { partyId: promise.partyId, promisedAmount: Number(promise.promisedAmount), promisedDate: promise.promisedDate.toISOString() }
      }), tx);
      return promise;
    });
  }

  async updatePromise(companyId: string, actorUserId: string, id: string, dto: UpdatePromiseDto) {
    const before = await this.getPromise(companyId, id);
    if (dto.status === PromiseToPayStatus.BROKEN && !dto.brokenReason) throw new BadRequestException("Broken promises require a reason");
    return this.prisma.$transaction(async (tx) => {
      const promise = await tx.promiseToPay.update({
        where: { id },
        data: {
          status: dto.status,
          notes: dto.notes,
          reminderDate: dto.reminderDate ? new Date(dto.reminderDate) : undefined,
          brokenReason: dto.brokenReason,
          brokenAt: dto.status === PromiseToPayStatus.BROKEN ? new Date() : undefined,
          fulfilledAt: dto.status === PromiseToPayStatus.FULFILLED ? new Date() : undefined
        }
      });
      await this.audit.record({ companyId, actorUserId, action: AuditAction.UPDATE, entityType: "PromiseToPay", entityId: id, before, after: promise }, tx);
      if (dto.status === PromiseToPayStatus.BROKEN) {
        await this.events?.publish(makeEvent({
        name: "PromiseBroken",
        companyId,
        actorUserId,
        entityType: "PromiseToPay",
        entityId: id,
        payload: { partyId: promise.partyId, promisedAmount: Number(promise.promisedAmount), paidAmount: Number(promise.paidAmount), brokenReason: dto.brokenReason }
        }), tx);
      }
      if (dto.status === PromiseToPayStatus.FULFILLED) {
        await this.events?.publish(makeEvent({
        name: "PromiseHonored",
        companyId,
        actorUserId,
        entityType: "PromiseToPay",
        entityId: id,
        payload: { partyId: promise.partyId, promisedAmount: Number(promise.promisedAmount), paidAmount: Number(promise.paidAmount) }
        }), tx);
      }
      return promise;
    });
  }

  async allocatePromisePayment(companyId: string, actorUserId: string, promiseId: string, dto: AllocatePromisePaymentDto, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const execute = async (trx: Prisma.TransactionClient) => {
      const promise = await trx.promiseToPay.findFirst({ where: { companyId, id: promiseId }, include: { allocations: true } });
      if (!promise) throw new NotFoundException("Promise to pay not found");
      if (promise.status === PromiseToPayStatus.BROKEN || promise.status === PromiseToPayStatus.CANCELLED) throw new BadRequestException("Closed promises cannot receive allocations");
      const payment = await trx.payment.findFirst({ where: { companyId, id: dto.paymentId, partyId: promise.partyId, status: PaymentStatus.POSTED } });
      if (!payment) throw new BadRequestException("Payment does not belong to this promise customer");
      const allocation = await trx.promiseToPayAllocation.create({ data: { companyId, promiseId, paymentId: dto.paymentId, amount: dto.amount } });
      const updatedRows = await trx.promiseToPay.updateMany({
        where: {
          companyId,
          id: promiseId,
          status: { notIn: [PromiseToPayStatus.BROKEN, PromiseToPayStatus.CANCELLED] },
          paidAmount: { lte: Number(promise.promisedAmount) - dto.amount }
        },
        data: { paidAmount: { increment: dto.amount } }
      });
      if (updatedRows.count !== 1) throw new BadRequestException("Promise allocation exceeds promised amount");
      const refreshed = await trx.promiseToPay.findFirstOrThrow({ where: { companyId, id: promiseId } });
      const paidAmount = Number(refreshed.paidAmount);
      const status = paidAmount >= Number(refreshed.promisedAmount) ? PromiseToPayStatus.FULFILLED : PromiseToPayStatus.PARTIALLY_FULFILLED;
      const updated = await trx.promiseToPay.update({
        where: { id: promiseId },
        data: { status, fulfilledAt: status === PromiseToPayStatus.FULFILLED ? new Date() : undefined }
      });
      await this.audit.record({ companyId, actorUserId, action: AuditAction.UPDATE, entityType: "PromiseToPay", entityId: promiseId, before: promise, after: { updated, allocation } }, trx);
      if (status === PromiseToPayStatus.FULFILLED) {
        await this.events?.publish(makeEvent({
          name: "PromiseHonored",
          companyId,
          actorUserId,
          entityType: "PromiseToPay",
          entityId: promiseId,
          payload: { partyId: promise.partyId, promisedAmount: Number(promise.promisedAmount), paidAmount }
        }), trx);
      }
      return updated;
    };
    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async detectFulfillment(companyId: string, actorUserId: string, promiseId: string) {
    const promise = await this.getPromise(companyId, promiseId);
    if (
      !promise.invoiceId ||
      promise.status === PromiseToPayStatus.FULFILLED ||
      promise.status === PromiseToPayStatus.BROKEN ||
      promise.status === PromiseToPayStatus.CANCELLED
    ) return promise;
    const payments = await this.prisma.paymentAllocation.findMany({
      where: { companyId, invoiceId: promise.invoiceId, payment: { status: PaymentStatus.POSTED, paymentDate: { lte: promise.promisedDate } } },
      include: { payment: true }
    });
    const paidAmount = payments.reduce((sum, allocation) => sum + Number(allocation.amount), 0);
    if (paidAmount < Number(promise.promisedAmount)) {
      return this.prisma.promiseToPay.update({ where: { id: promiseId }, data: { paidAmount, status: paidAmount > 0 ? PromiseToPayStatus.PARTIALLY_FULFILLED : promise.status } });
    }
    return this.updatePromise(companyId, actorUserId, promiseId, { status: PromiseToPayStatus.FULFILLED });
  }

  async detectBreaches(companyId: string, actorUserId: string, asOf = new Date()) {
    const breached = await this.prisma.promiseToPay.findMany({
      where: { companyId, status: { in: [PromiseToPayStatus.OPEN, PromiseToPayStatus.PARTIALLY_FULFILLED] }, promisedDate: { lt: asOf } }
    });
    const unpaidBreaches = breached.filter((promise) => Number(promise.paidAmount) < Number(promise.promisedAmount));
    for (const promise of unpaidBreaches) {
      await this.updatePromise(companyId, actorUserId, promise.id, { status: PromiseToPayStatus.BROKEN, brokenReason: "Promise date passed without full payment" });
    }
    return { breached: unpaidBreaches.length };
  }

  async reliability(companyId: string, partyId: string) {
    await this.assertCustomer(companyId, partyId);
    const promises = await this.prisma.promiseToPay.findMany({ where: { companyId, partyId } });
    const total = promises.length;
    const fulfilled = promises.filter((promise) => promise.status === PromiseToPayStatus.FULFILLED).length;
    const broken = promises.filter((promise) => promise.status === PromiseToPayStatus.BROKEN).length;
    const partiallyFulfilled = promises.filter((promise) => promise.status === PromiseToPayStatus.PARTIALLY_FULFILLED).length;
    const promisedAmount = promises.reduce((sum, promise) => sum + Number(promise.promisedAmount), 0);
    const paidAmount = promises.reduce((sum, promise) => sum + Number(promise.paidAmount), 0);
    return {
      partyId,
      total,
      fulfilled,
      partiallyFulfilled,
      broken,
      fulfillmentRate: total ? fulfilled / total : 0,
      breachRate: total ? broken / total : 0,
      amountReliability: promisedAmount ? paidAmount / promisedAmount : 0,
      promisedAmount,
      paidAmount
    };
  }

  async dashboard(companyId: string) {
    const now = new Date();
    const [openFollowUps, overdueFollowUps, openPromises, brokenPromises, overdueInvoices] = await Promise.all([
      this.prisma.collectionFollowUp.count({ where: { companyId, status: { in: [CollectionFollowUpStatus.OPEN, CollectionFollowUpStatus.IN_PROGRESS] } } }),
      this.prisma.collectionFollowUp.count({ where: { companyId, status: { in: [CollectionFollowUpStatus.OPEN, CollectionFollowUpStatus.IN_PROGRESS] }, dueDate: { lt: now } } }),
      this.prisma.promiseToPay.count({ where: { companyId, status: { in: [PromiseToPayStatus.OPEN, PromiseToPayStatus.PARTIALLY_FULFILLED] } } }),
      this.prisma.promiseToPay.count({ where: { companyId, status: PromiseToPayStatus.BROKEN } }),
      this.prisma.invoice.aggregate({ where: { companyId, type: InvoiceType.SALES, status: { not: DocumentStatus.VOID }, dueDate: { lt: now }, amountDue: { gt: 0 } }, _sum: { amountDue: true }, _count: true })
    ]);
    return {
      openFollowUps,
      overdueFollowUps,
      openPromises,
      brokenPromises,
      overdueInvoiceCount: overdueInvoices._count,
      overdueExposure: Number(overdueInvoices._sum.amountDue ?? 0)
    };
  }

  private async assertCustomer(companyId: string, partyId: string) {
    const party = await this.prisma.party.findFirst({ where: { companyId, id: partyId, type: PartyType.CUSTOMER, deletedAt: null } });
    if (!party) throw new BadRequestException("Customer does not belong to this company");
    return party;
  }

  private async assertCustomerInvoice(companyId: string, partyId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { companyId, id: invoiceId, partyId, type: InvoiceType.SALES, status: { not: DocumentStatus.VOID } } });
    if (!invoice) throw new BadRequestException("Invoice does not belong to this customer");
    return invoice;
  }

  private async assertActiveMembership(companyId: string, userId: string) {
    const membership = await this.prisma.companyMembership.findFirst({ where: { companyId, userId, isActive: true } });
    if (!membership) throw new BadRequestException("Assigned user is not an active member of this company");
    return membership;
  }
}

import { BadRequestException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { AuditAction, DocumentStatus, InvoiceType, PartyType, PaymentDirection, PaymentStatus, PromiseToPayStatus } from "@finos/database";
import { AuditService } from "../../shared/audit/audit.service";
import { makeEvent } from "../../shared/events/domain-events";
import { DomainEventsService } from "../../shared/events/domain-events.service";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { DocumentNumberService } from "../../shared/sequences/document-number.service";
import { LedgerPostingService } from "../accounting/ledger-posting.service";
import { CreatePaymentDto, PaymentAllocationDto } from "./dto/create-payment.dto";
import { PaymentsRepository } from "./payments.repository";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: PaymentsRepository,
    private readonly numbers: DocumentNumberService,
    private readonly ledger: LedgerPostingService,
    private readonly audit: AuditService,
    @Optional() private readonly events?: DomainEventsService
  ) {}

  list(companyId: string) {
    return this.repo.list(companyId);
  }

  async get(companyId: string, id: string) {
    const payment = await this.repo.find(companyId, id);
    if (!payment) throw new NotFoundException("Payment not found");
    return payment;
  }

  async create(companyId: string, actorUserId: string, dto: CreatePaymentDto) {
    const party = await this.prisma.party.findFirst({ where: { companyId, id: dto.partyId, deletedAt: null } });
    if (!party) throw new BadRequestException("Party does not belong to this company");
    if (dto.direction === PaymentDirection.IN && party.type !== PartyType.CUSTOMER) {
      throw new BadRequestException("Incoming payments must be linked to customers");
    }
    if (dto.direction === PaymentDirection.OUT && party.type !== PartyType.SUPPLIER) {
      throw new BadRequestException("Outgoing payments must be linked to suppliers");
    }

    const allocations = dto.allocations ?? await this.autoAllocate(companyId, dto.partyId, dto.direction, dto.amount);
    const normalizedAllocations = this.mergeAllocations(allocations);
    const allocated = normalizedAllocations.reduce((sum, allocation) => sum + allocation.amount, 0);
    if (allocated > dto.amount) throw new BadRequestException("Allocated amount exceeds payment amount");

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          companyId,
          partyId: dto.partyId,
          bankAccountId: dto.bankAccountId,
          direction: dto.direction,
          number: await this.numbers.next(tx, companyId, "PAYMENT"),
          paymentDate: new Date(dto.paymentDate),
          amount: dto.amount,
          method: dto.method,
          reference: dto.reference,
          notes: dto.notes,
          allocations: { create: normalizedAllocations.map((allocation) => ({ companyId, invoiceId: allocation.invoiceId, amount: allocation.amount })) }
        },
        include: { allocations: true }
      });

      for (const allocation of normalizedAllocations) {
        const invoice = await tx.invoice.findFirst({
          where: {
            id: allocation.invoiceId,
            companyId,
            partyId: dto.partyId,
            type: dto.direction === PaymentDirection.IN ? InvoiceType.SALES : InvoiceType.PURCHASE
          }
        });
        if (!invoice) throw new BadRequestException("Invoice allocation does not belong to this company");
        const applied = await tx.invoice.updateMany({
          where: {
            id: invoice.id,
            companyId,
            amountDue: { gte: allocation.amount },
            status: { not: DocumentStatus.VOID }
          },
          data: {
            amountPaid: { increment: allocation.amount },
            amountDue: { decrement: allocation.amount }
          }
        });
        if (applied.count !== 1) throw new BadRequestException("Allocated amount exceeds open invoice amount");
        const updatedInvoice = await tx.invoice.findFirstOrThrow({ where: { companyId, id: invoice.id } });
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: Number(updatedInvoice.amountDue) <= 0 ? DocumentStatus.PAID : DocumentStatus.PARTIAL }
        });
      }

      const journal = await this.ledger.post(tx, {
        companyId,
        sourceType: "Payment",
        sourceId: payment.id,
        paymentId: payment.id,
        entryDate: payment.paymentDate,
        memo: `Payment ${payment.number}`,
        lines: this.ledger.paymentLines(dto.direction, dto.partyId, dto.amount)
      });

      await this.audit.record({ companyId, actorUserId, action: AuditAction.CREATE, entityType: "Payment", entityId: payment.id, after: { payment, journal } }, tx);
      await this.events?.publish(makeEvent({
        name: "PaymentCreated",
        companyId,
        actorUserId,
        entityType: "Payment",
        entityId: payment.id,
        payload: { partyId: payment.partyId, paymentNumber: payment.number, amount: Number(payment.amount), direction: payment.direction }
      }), tx);
      for (const allocation of payment.allocations) {
        await this.events?.publish(makeEvent({
          name: "PaymentAllocated",
          companyId,
          actorUserId,
          entityType: "PaymentAllocation",
          entityId: allocation.id,
          payload: { partyId: payment.partyId, paymentId: payment.id, invoiceId: allocation.invoiceId, amount: Number(allocation.amount) }
        }), tx);
      }
      return payment;
    });
  }

  async reverse(companyId: string, actorUserId: string, id: string, reason?: string) {
    const payment = await this.get(companyId, id);
    if (payment.status === PaymentStatus.VOID) throw new BadRequestException("Payment is already void");

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.payment.updateMany({
        where: { id, companyId, status: PaymentStatus.POSTED },
        data: { status: PaymentStatus.VOID }
      });
      if (claimed.count !== 1) throw new BadRequestException("Payment is already void");
      for (const allocation of payment.allocations) {
        const invoice = allocation.invoice;
        const amountPaid = Math.max(0, Number(invoice.amountPaid) - Number(allocation.amount));
        const amountDue = Number(invoice.total) - amountPaid;
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            amountPaid,
            amountDue,
            status: invoice.status === DocumentStatus.VOID ? DocumentStatus.VOID : amountPaid <= 0 ? DocumentStatus.SENT : amountDue <= 0 ? DocumentStatus.PAID : DocumentStatus.PARTIAL
          }
        });
      }
      const promiseAllocations = await tx.promiseToPayAllocation.findMany({ where: { companyId, paymentId: id } });
      await tx.promiseToPayAllocation.deleteMany({ where: { companyId, paymentId: id } });
      for (const promiseAllocation of promiseAllocations) {
        const remaining = await tx.promiseToPayAllocation.aggregate({
          where: { companyId, promiseId: promiseAllocation.promiseId },
          _sum: { amount: true }
        });
        const paidAmount = Number(remaining._sum.amount ?? 0);
        const promise = await tx.promiseToPay.findFirst({ where: { companyId, id: promiseAllocation.promiseId } });
        if (promise) {
          await tx.promiseToPay.update({
            where: { id: promise.id },
            data: {
              paidAmount,
              status: paidAmount <= 0 ? PromiseToPayStatus.OPEN : paidAmount >= Number(promise.promisedAmount) ? PromiseToPayStatus.FULFILLED : PromiseToPayStatus.PARTIALLY_FULFILLED,
              fulfilledAt: paidAmount >= Number(promise.promisedAmount) ? promise.fulfilledAt ?? new Date() : null
            }
          });
        }
      }
      const journals = await this.ledger.reverse(tx, {
        companyId,
        sourceType: "Payment",
        sourceId: payment.id,
        reversalSourceType: "PaymentReversal",
        reversalSourceId: payment.id,
        paymentId: payment.id,
        entryDate: new Date(),
        memo: reason ?? `Reverse payment ${payment.number}`
      });
      const updated = await tx.payment.update({
        where: { id },
        data: { notes: reason ? `${payment.notes ?? ""}\nVoid reason: ${reason}`.trim() : payment.notes }
      });
      await this.audit.record({ companyId, actorUserId, action: AuditAction.VOID, entityType: "Payment", entityId: id, before: payment, after: { updated, journals } }, tx);
      await this.events?.publish(makeEvent({
        name: "PaymentReversed",
        companyId,
        actorUserId,
        entityType: "Payment",
        entityId: updated.id,
        payload: { partyId: payment.partyId, paymentNumber: payment.number, amount: Number(payment.amount), reason }
      }), tx);
      return updated;
    });
  }

  private async autoAllocate(companyId: string, partyId: string, direction: PaymentDirection, amount: number): Promise<PaymentAllocationDto[]> {
    const type = direction === PaymentDirection.IN ? InvoiceType.SALES : InvoiceType.PURCHASE;
    const invoices = await this.prisma.invoice.findMany({
      where: { companyId, partyId, type, amountDue: { gt: 0 }, status: { not: DocumentStatus.VOID } },
      orderBy: [{ dueDate: "asc" }, { issueDate: "asc" }]
    });
    let remaining = amount;
    const allocations: PaymentAllocationDto[] = [];
    for (const invoice of invoices) {
      if (remaining <= 0) break;
      const allocation = Math.min(Number(invoice.amountDue), remaining);
      allocations.push({ invoiceId: invoice.id, amount: allocation });
      remaining -= allocation;
    }
    return allocations;
  }

  private mergeAllocations(allocations: PaymentAllocationDto[]) {
    const byInvoice = new Map<string, number>();
    for (const allocation of allocations) {
      byInvoice.set(allocation.invoiceId, (byInvoice.get(allocation.invoiceId) ?? 0) + allocation.amount);
    }
    return Array.from(byInvoice.entries()).map(([invoiceId, allocationAmount]) => ({ invoiceId, amount: allocationAmount }));
  }
}

import { BadRequestException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { AuditAction, DocumentStatus, InvoiceType, PartyType, StockMovementType } from "@finos/database";
import { AuditService } from "../../shared/audit/audit.service";
import { makeEvent } from "../../shared/events/domain-events";
import { DomainEventsService } from "../../shared/events/domain-events.service";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { DocumentNumberService } from "../../shared/sequences/document-number.service";
import { InventoryService } from "../inventory/inventory.service";
import { LedgerPostingService } from "../accounting/ledger-posting.service";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";
import { SalesRepository } from "./sales.repository";

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: SalesRepository,
    private readonly numbers: DocumentNumberService,
    private readonly ledger: LedgerPostingService,
    private readonly inventory: InventoryService,
    private readonly audit: AuditService,
    @Optional() private readonly events?: DomainEventsService
  ) {}

  list(companyId: string) {
    return this.repo.list(companyId);
  }

  async get(companyId: string, id: string) {
    const invoice = await this.repo.find(companyId, id);
    if (!invoice) throw new NotFoundException("Sales invoice not found");
    return invoice;
  }

  async create(companyId: string, actorUserId: string, dto: CreateInvoiceDto) {
    const party = await this.prisma.party.findFirst({ where: { id: dto.partyId, companyId, type: PartyType.CUSTOMER, deletedAt: null } });
    if (!party) throw new BadRequestException("Customer does not belong to this company");
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId } });

    const productIds = dto.lines.map((line) => line.productId).filter(Boolean) as string[];
    const products = productIds.length
      ? await this.prisma.product.findMany({ where: { companyId, id: { in: productIds }, deletedAt: null } })
      : [];
    if (products.length !== productIds.length) throw new BadRequestException("One or more products do not belong to this company");

    const totals = this.calculate(dto.lines);
    const invoice = await this.prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          companyId,
          partyId: dto.partyId,
          type: InvoiceType.SALES,
          status: DocumentStatus.DRAFT,
          number: await this.numbers.next(tx, companyId, "SALES_INVOICE"),
          issueDate: new Date(dto.issueDate),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          taxTotal: totals.taxTotal,
          total: totals.total,
          amountDue: totals.total,
          currency: dto.currency ?? company.currency,
          terms: dto.terms,
          notes: dto.notes,
          lines: { create: totals.lines.map((line) => ({ ...line, companyId })) }
        },
        include: { lines: true }
      });
      await this.audit.record({ companyId, actorUserId, action: AuditAction.CREATE, entityType: "Invoice", entityId: created.id, after: created }, tx);
      await this.events?.publish(makeEvent({
        name: "InvoiceCreated",
        companyId,
        actorUserId,
        entityType: "Invoice",
        entityId: created.id,
        payload: { partyId: created.partyId, invoiceNumber: created.number, total: Number(created.total), amountDue: Number(created.amountDue) }
      }), tx);
      return created;
    });
    return invoice;
  }

  async post(companyId: string, actorUserId: string, id: string, locationId?: string) {
    const invoice = await this.get(companyId, id);
    if (invoice.status !== DocumentStatus.DRAFT) throw new BadRequestException("Only draft invoices can be posted");
    return this.prisma.$transaction(async (tx) => {
      const journal = await this.ledger.post(tx, {
        ...this.ledger.salesInvoiceLines(companyId, invoice.id, invoice.partyId, Number(invoice.total), Number(invoice.taxTotal)),
        entryDate: invoice.issueDate,
        memo: `Sales invoice ${invoice.number}`
      });

      if (locationId) {
        for (const line of invoice.lines) {
          if (line.productId && line.product?.isInventoryItem) {
            await this.inventory.postMovement(companyId, actorUserId, {
              productId: line.productId,
              locationId,
              type: StockMovementType.SALES_ISSUE,
              quantity: -Number(line.quantity),
              referenceType: "SalesInvoice",
              referenceId: invoice.id,
              notes: `Sales invoice ${invoice.number}`
            }, tx);
          }
        }
      }

      const updated = await tx.invoice.update({ where: { id }, data: { status: DocumentStatus.SENT }, include: { lines: true } });
      await this.audit.record({ companyId, actorUserId, action: AuditAction.POST, entityType: "Invoice", entityId: id, before: invoice, after: { updated, journal } }, tx);
      await this.events?.publish(makeEvent({
        name: "InvoicePosted",
        companyId,
        actorUserId,
        entityType: "Invoice",
        entityId: updated.id,
        payload: { partyId: updated.partyId, invoiceNumber: updated.number, total: Number(updated.total), amountDue: Number(updated.amountDue) }
      }), tx);
      return updated;
    });
  }

  async reverse(companyId: string, actorUserId: string, id: string, reason?: string) {
    const invoice = await this.get(companyId, id);
    if (invoice.status === DocumentStatus.VOID) throw new BadRequestException("Invoice is already void");
    if (Number(invoice.amountPaid) > 0) throw new BadRequestException("Paid invoices must have payments reversed before invoice reversal");

    return this.prisma.$transaction(async (tx) => {
      const journals = await this.ledger.reverse(tx, {
        companyId,
        sourceType: "SalesInvoice",
        sourceId: invoice.id,
        reversalSourceType: "SalesInvoiceReversal",
        reversalSourceId: invoice.id,
        invoiceId: invoice.id,
        entryDate: new Date(),
        memo: reason ?? `Reverse sales invoice ${invoice.number}`
      });
      const stockReversals = await this.inventory.reverseMovements(companyId, actorUserId, "SalesInvoice", invoice.id, reason, tx);
      const updated = await tx.invoice.update({
        where: { id },
        data: { status: DocumentStatus.VOID, amountDue: 0, voidedAt: new Date(), notes: reason ? `${invoice.notes ?? ""}\nVoid reason: ${reason}`.trim() : invoice.notes },
        include: { lines: true }
      });
      await this.audit.record({ companyId, actorUserId, action: AuditAction.VOID, entityType: "Invoice", entityId: id, before: invoice, after: { updated, journals, stockReversals } }, tx);
      await this.events?.publish(makeEvent({
        name: "InvoiceReversed",
        companyId,
        actorUserId,
        entityType: "Invoice",
        entityId: updated.id,
        payload: { partyId: updated.partyId, invoiceNumber: updated.number, reason }
      }), tx);
      return updated;
    });
  }

  private calculate(lines: CreateInvoiceDto["lines"]) {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    const calculated = lines.map((line) => {
      const gross = line.quantity * line.unitPrice;
      const discountAmount = line.discountAmount ?? 0;
      const taxable = gross - discountAmount;
      const taxAmount = taxable * ((line.taxRate ?? 0) / 100);
      const lineTotal = taxable + taxAmount;
      subtotal += gross;
      discountTotal += discountAmount;
      taxTotal += taxAmount;
      return { productId: line.productId, description: line.description, quantity: line.quantity, unitPrice: line.unitPrice, discountAmount, taxRate: line.taxRate ?? 0, taxAmount, lineTotal };
    });
    return { subtotal, discountTotal, taxTotal, total: subtotal - discountTotal + taxTotal, lines: calculated };
  }
}

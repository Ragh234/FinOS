import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, NotificationChannel, NotificationStatus, Prisma } from "@finos/database";
import { AuditService } from "../../shared/audit/audit.service";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { BullmqService, QUEUES } from "../../shared/queues/bullmq.service";
import { QueueNotificationDto, UpsertNotificationTemplateDto } from "./dto/notifications.dto";
import { EmailNotificationProvider, InAppNotificationProvider, NotificationProvider, WhatsAppNotificationProvider } from "./notification-providers";

const DEFAULT_TEMPLATES: Array<UpsertNotificationTemplateDto> = [
  { code: "overdue_invoice_reminder", channel: NotificationChannel.EMAIL, name: "Overdue invoice reminder", subject: "Invoice {{invoiceNumber}} is overdue", body: "Invoice {{invoiceNumber}} has {{amountDue}} overdue. Please arrange payment." },
  { code: "promise_due_reminder", channel: NotificationChannel.EMAIL, name: "Promise due reminder", subject: "Payment promise due {{promisedDate}}", body: "A promised payment of {{promisedAmount}} is due on {{promisedDate}}." },
  { code: "broken_promise_alert", channel: NotificationChannel.IN_APP, name: "Broken promise alert", subject: "Promise broken", body: "{{customerName}} missed a payment promise of {{promisedAmount}}." },
  { code: "credit_limit_warning", channel: NotificationChannel.IN_APP, name: "Credit limit warning", subject: "Credit limit warning", body: "{{customerName}} has reached {{utilizationPercent}}% credit utilization." },
  { code: "collection_follow_up_reminder", channel: NotificationChannel.IN_APP, name: "Collection follow-up reminder", subject: "Collection follow-up due", body: "Follow up with {{customerName}} for {{expectedAmount}}." }
];

@Injectable()
export class NotificationsService {
  private readonly providers: NotificationProvider[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly bullmq: BullmqService,
    inApp: InAppNotificationProvider,
    email: EmailNotificationProvider,
    whatsapp: WhatsAppNotificationProvider
  ) {
    this.providers = [inApp, email, whatsapp];
  }

  listTemplates(companyId: string) {
    return this.prisma.notificationTemplate.findMany({ where: { companyId }, orderBy: [{ channel: "asc" }, { code: "asc" }] });
  }

  async upsertTemplate(companyId: string, actorUserId: string, dto: UpsertNotificationTemplateDto) {
    const template = await this.prisma.notificationTemplate.upsert({
      where: { companyId_code_channel: { companyId, code: dto.code, channel: dto.channel } },
      create: { companyId, code: dto.code, channel: dto.channel, name: dto.name, subject: dto.subject, body: dto.body, variables: this.toJson(dto.variables) },
      update: { name: dto.name, subject: dto.subject, body: dto.body, variables: this.toJson(dto.variables), isActive: true }
    });
    await this.audit.record({ companyId, actorUserId, action: AuditAction.UPDATE, entityType: "NotificationTemplate", entityId: template.id, after: template });
    return template;
  }

  async ensureDefaultTemplates(companyId: string, actorUserId?: string) {
    const templates = [];
    for (const template of DEFAULT_TEMPLATES) {
      templates.push(await this.upsertTemplate(companyId, actorUserId ?? "system", template));
    }
    return templates;
  }

  listDeliveries(companyId: string) {
    return this.prisma.notificationDelivery.findMany({
      where: { companyId },
      include: { template: true, recipientUser: true, party: true },
      orderBy: { createdAt: "desc" },
      take: 200
    });
  }

  async queue(companyId: string, actorUserId: string | undefined, dto: QueueNotificationDto) {
    const template = await this.prisma.notificationTemplate.findFirst({ where: { companyId, code: dto.templateCode, channel: dto.channel, isActive: true } });
    if (!template) throw new BadRequestException("Notification template not found");
    if (dto.recipientUserId) await this.assertUser(companyId, dto.recipientUserId);
    if (dto.partyId) await this.assertParty(companyId, dto.partyId);
    const rendered = this.render(template.body, dto.variables ?? {});
    const subject = template.subject ? this.render(template.subject, dto.variables ?? {}) : undefined;
    const delivery = await this.prisma.notificationDelivery.create({
      data: {
        companyId,
        templateId: template.id,
        recipientUserId: dto.recipientUserId,
        partyId: dto.partyId,
        channel: dto.channel,
        status: NotificationStatus.QUEUED,
        subject,
        body: rendered,
        destination: dto.destination,
        entityType: dto.entityType,
        entityId: dto.entityId
      }
    });
    await this.audit.record({ companyId, actorUserId, action: AuditAction.CREATE, entityType: "NotificationDelivery", entityId: delivery.id, after: delivery });
    await this.bullmq.add(QUEUES.notifications, "notifications.dispatch", { companyId, deliveryId: delivery.id }, { jobId: `notifications.dispatch:${delivery.id}` });
    return delivery;
  }

  async dispatchQueued(companyId: string, deliveryId?: string) {
    const deliveries = await this.prisma.notificationDelivery.findMany({
      where: { companyId, status: NotificationStatus.QUEUED, ...(deliveryId ? { id: deliveryId } : {}) },
      take: deliveryId ? 1 : 50
    });
    const results = [];
    for (const delivery of deliveries) {
      const provider = this.providers.find((candidate) => candidate.channel === delivery.channel);
      if (!provider) throw new BadRequestException(`No notification provider for ${delivery.channel}`);
      try {
        const sent = await provider.send({
          deliveryId: delivery.id,
          companyId,
          destination: delivery.destination,
          subject: delivery.subject,
          body: delivery.body
        });
        results.push(await this.prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: { status: NotificationStatus.SENT, provider: sent.provider, providerMessageId: sent.providerMessageId, sentAt: new Date() }
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Notification dispatch failed";
        results.push(await this.prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: { status: NotificationStatus.FAILED, errorMessage: message }
        }));
        throw error;
      }
    }
    return results;
  }

  private render(template: string, variables: Record<string, unknown>) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(variables[key] ?? ""));
  }

  private async assertUser(companyId: string, userId: string) {
    const membership = await this.prisma.companyMembership.findFirst({ where: { companyId, userId, isActive: true } });
    if (!membership) throw new BadRequestException("Notification recipient is not a company member");
  }

  private async assertParty(companyId: string, partyId: string) {
    const party = await this.prisma.party.findFirst({ where: { companyId, id: partyId, deletedAt: null } });
    if (!party) throw new BadRequestException("Notification party does not belong to this company");
  }

  private toJson(value: Record<string, unknown> | undefined) {
    return value === undefined ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
  }
}


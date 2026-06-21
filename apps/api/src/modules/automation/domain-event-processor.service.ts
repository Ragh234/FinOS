import { Injectable } from "@nestjs/common";
import { NotificationChannel } from "@finos/database";
import { DomainEvent } from "../../shared/events/domain-events";
import { BullmqService, QUEUES } from "../../shared/queues/bullmq.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class DomainEventProcessorService {
  constructor(private readonly bullmq: BullmqService, private readonly notifications: NotificationsService) {}

  async handle(event: DomainEvent) {
    switch (event.name) {
      case "InvoiceCreated":
      case "InvoicePosted":
        await this.enqueueCreditRefresh(event);
        break;
      case "InvoiceReversed":
      case "PaymentReversed":
        await this.enqueueCreditRefresh(event);
        break;
      case "PaymentCreated":
      case "PaymentAllocated":
        await this.enqueueCreditRefresh(event);
        break;
      case "PromiseCreated":
        await this.queuePromiseDueReminder(event);
        break;
      case "PromiseBroken":
        await this.queueBrokenPromiseAlert(event);
        await this.enqueueCreditRefresh(event);
        break;
      case "PromiseHonored":
        await this.enqueueCreditRefresh(event);
        break;
      case "RiskScoreUpdated":
        await this.queueCreditLimitWarning(event);
        break;
      case "CreditLimitExceeded":
        await this.queueCreditLimitWarning(event);
        break;
    }
  }

  private async enqueueCreditRefresh(event: DomainEvent) {
    const partyId = event.payload.partyId;
    if (typeof partyId !== "string") return;
    await this.bullmq.add(QUEUES.credit, "credit.profile.refresh", {
      companyId: event.companyId,
      partyId,
      actorUserId: event.actorUserId
    }, { jobId: `credit.profile.refresh:${event.companyId}:${partyId}` });
    await this.bullmq.add(QUEUES.credit, "credit.risk.refresh", {
      companyId: event.companyId,
      partyId,
      actorUserId: event.actorUserId
    }, { jobId: `credit.risk.refresh:${event.companyId}:${partyId}` });
  }

  private async queuePromiseDueReminder(event: DomainEvent) {
    const destination = typeof event.payload.destination === "string" ? event.payload.destination : "in-app";
    await this.notifications.queue(event.companyId, event.actorUserId, {
      templateCode: "promise_due_reminder",
      channel: NotificationChannel.EMAIL,
      destination,
      partyId: this.stringPayload(event, "partyId"),
      entityType: event.entityType,
      entityId: event.entityId,
      variables: event.payload
    }).catch(() => undefined);
  }

  private async queueBrokenPromiseAlert(event: DomainEvent) {
    await this.notifications.queue(event.companyId, event.actorUserId, {
      templateCode: "broken_promise_alert",
      channel: NotificationChannel.IN_APP,
      destination: "in-app",
      partyId: this.stringPayload(event, "partyId"),
      entityType: event.entityType,
      entityId: event.entityId,
      variables: event.payload
    }).catch(() => undefined);
  }

  private async queueCreditLimitWarning(event: DomainEvent) {
    const utilizationPercent = Number(event.payload.utilizationPercent ?? 0);
    if (event.name === "RiskScoreUpdated" && utilizationPercent < 100) return;
    await this.notifications.queue(event.companyId, event.actorUserId, {
      templateCode: "credit_limit_warning",
      channel: NotificationChannel.IN_APP,
      destination: "in-app",
      partyId: this.stringPayload(event, "partyId"),
      entityType: event.entityType,
      entityId: event.entityId,
      variables: event.payload
    }).catch(() => undefined);
  }

  private stringPayload(event: DomainEvent, key: string) {
    const value = event.payload[key];
    return typeof value === "string" ? value : undefined;
  }
}


import { Injectable, OnModuleInit } from "@nestjs/common";
import { Job } from "bullmq";
import { DomainEvent } from "../../shared/events/domain-events";
import { BullmqService, QUEUES } from "../../shared/queues/bullmq.service";
import { CollectionsService } from "../collections/collections.service";
import { CreditIntelligenceService } from "../credit-intelligence/credit-intelligence.service";
import { NotificationsService } from "../notifications/notifications.service";
import { DomainEventProcessorService } from "./domain-event-processor.service";

@Injectable()
export class BackgroundWorkersService implements OnModuleInit {
  constructor(
    private readonly bullmq: BullmqService,
    private readonly events: DomainEventProcessorService,
    private readonly credit: CreditIntelligenceService,
    private readonly collections: CollectionsService,
    private readonly notifications: NotificationsService
  ) {}

  onModuleInit() {
    this.bullmq.registerWorker<DomainEvent>(QUEUES.domainEvents, async (job) => this.events.handle(job.data));
    this.bullmq.registerWorker(QUEUES.credit, async (job: Job<{ companyId: string; partyId: string; actorUserId?: string }>) => {
      if (job.name === "credit.profile.refresh") return this.credit.refreshProfile(job.data.companyId, job.data.actorUserId ?? "system", job.data.partyId);
      if (job.name === "credit.risk.refresh") return this.credit.recomputeScore(job.data.companyId, job.data.actorUserId ?? "system", job.data.partyId);
      return undefined;
    });
    this.bullmq.registerWorker(QUEUES.collections, async (job: Job<{ companyId: string; actorUserId?: string; asOf?: string }>) => {
      if (job.name === "collections.promise.detect-breaches") {
        return this.collections.detectBreaches(job.data.companyId, job.data.actorUserId ?? "system", job.data.asOf ? new Date(job.data.asOf) : new Date());
      }
      if (job.name === "collections.dashboard.refresh") return this.collections.dashboard(job.data.companyId);
      return undefined;
    });
    this.bullmq.registerWorker(QUEUES.notifications, async (job: Job<{ companyId: string; deliveryId?: string }>) => {
      if (job.name === "notifications.dispatch") return this.notifications.dispatchQueued(job.data.companyId, job.data.deliveryId);
      return undefined;
    });
  }
}


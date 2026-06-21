import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "../../shared/prisma/prisma.module";
import { QueuesModule } from "../../shared/queues/queues.module";
import { CollectionsModule } from "../collections/collections.module";
import { CreditIntelligenceModule } from "../credit-intelligence/credit-intelligence.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { BackgroundWorkersService } from "./background-workers.service";
import { DomainEventProcessorService } from "./domain-event-processor.service";
import { ScheduledJobsService } from "./scheduled-jobs.service";
import { OutboxPublisherService } from "./outbox-publisher.service";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    QueuesModule,
    CollectionsModule,
    CreditIntelligenceModule,
    NotificationsModule
  ],
  providers: [DomainEventProcessorService, BackgroundWorkersService, ScheduledJobsService, OutboxPublisherService],
  exports: [DomainEventProcessorService]
})
export class AutomationModule {}

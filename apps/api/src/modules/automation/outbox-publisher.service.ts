import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { OutboxEventStatus, Prisma } from "@finos/database";
import { BullmqService, QUEUES } from "../../shared/queues/bullmq.service";
import { PrismaService } from "../../shared/prisma/prisma.service";

@Injectable()
export class OutboxPublisherService {
  private readonly logger = new Logger(OutboxPublisherService.name);

  constructor(private readonly prisma: PrismaService, private readonly bullmq: BullmqService) {}

  @Cron("*/10 * * * * *")
  async publishPending() {
    const candidates = await this.prisma.outboxEvent.findMany({
      where: { status: { in: [OutboxEventStatus.PENDING, OutboxEventStatus.FAILED] }, retryCount: { lt: 8 } },
      orderBy: { createdAt: "asc" },
      take: 50
    });

    for (const event of candidates) {
      await this.processOne(event.id);
    }
  }

  async processOne(id: string) {
    const claimed = await this.prisma.outboxEvent.updateMany({
      where: { id, status: { in: [OutboxEventStatus.PENDING, OutboxEventStatus.FAILED] } },
      data: { status: OutboxEventStatus.PROCESSING }
    });
    if (claimed.count !== 1) return undefined;

    const event = await this.prisma.outboxEvent.findUniqueOrThrow({ where: { id } });
    const jobId = `outbox:${event.id}`;
    const correlationId = `${event.companyId}:${event.aggregateType}:${event.aggregateId}`;

    try {
      await this.bullmq.add(QUEUES.domainEvents, event.eventType, event.payload, { jobId });
      const processed = await this.prisma.outboxEvent.update({
        where: { id },
        data: { status: OutboxEventStatus.PROCESSED, processedAt: new Date(), lastError: null }
      });
      this.logger.log({ message: "outbox_event_processed", jobId, correlationId, companyId: event.companyId, eventType: event.eventType });
      return processed;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Outbox publish failed";
      const failed = await this.prisma.outboxEvent.update({
        where: { id },
        data: {
          status: OutboxEventStatus.FAILED,
          retryCount: { increment: 1 },
          lastError: message
        }
      });
      this.logger.error({ message: "outbox_event_failed", jobId, correlationId, companyId: event.companyId, eventType: event.eventType, error: message });
      return failed;
    }
  }
}

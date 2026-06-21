import { Injectable } from "@nestjs/common";
import { Prisma } from "@finos/database";
import { DomainEvent } from "./domain-events";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DomainEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async publish(event: DomainEvent, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.outboxEvent.create({
      data: {
        companyId: event.companyId,
        eventType: event.name,
        aggregateType: event.entityType,
        aggregateId: event.entityId,
        payload: event as unknown as Prisma.InputJsonValue
      }
    });
  }
}

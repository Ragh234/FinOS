import { Module } from "@nestjs/common";
import { AuditService } from "../../shared/audit/audit.service";
import { EventsModule } from "../../shared/events/events.module";
import { IdempotencyModule } from "../../shared/idempotency/idempotency.module";
import { PrismaModule } from "../../shared/prisma/prisma.module";
import { CollectionsController } from "./collections.controller";
import { CollectionsService } from "./collections.service";

@Module({
  imports: [PrismaModule, EventsModule, IdempotencyModule],
  controllers: [CollectionsController],
  providers: [CollectionsService, AuditService],
  exports: [CollectionsService]
})
export class CollectionsModule {}

import { Module } from "@nestjs/common";
import { AuditService } from "../../shared/audit/audit.service";
import { EventsModule } from "../../shared/events/events.module";
import { PrismaModule } from "../../shared/prisma/prisma.module";
import { CreditIntelligenceController } from "./credit-intelligence.controller";
import { CreditIntelligenceService } from "./credit-intelligence.service";

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [CreditIntelligenceController],
  providers: [CreditIntelligenceService, AuditService],
  exports: [CreditIntelligenceService]
})
export class CreditIntelligenceModule {}

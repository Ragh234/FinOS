import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { DomainEventsService } from "./domain-events.service";

@Module({
  imports: [PrismaModule],
  providers: [DomainEventsService],
  exports: [DomainEventsService]
})
export class EventsModule {}

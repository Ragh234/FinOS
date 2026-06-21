import { Module } from "@nestjs/common";
import { AuditService } from "../../shared/audit/audit.service";
import { PrismaModule } from "../../shared/prisma/prisma.module";
import { QueuesModule } from "../../shared/queues/queues.module";
import { EmailNotificationProvider, InAppNotificationProvider, WhatsAppNotificationProvider } from "./notification-providers";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [PrismaModule, QueuesModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    AuditService,
    InAppNotificationProvider,
    EmailNotificationProvider,
    WhatsAppNotificationProvider
  ],
  exports: [NotificationsService]
})
export class NotificationsModule {}


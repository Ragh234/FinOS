import { Body, Controller, Get, Post } from "@nestjs/common";
import { CurrentTenant } from "../../shared/auth/tenant.decorator";
import { TenantContext } from "../../shared/auth/auth.types";
import { Permissions } from "../../shared/rbac/permissions.decorator";
import { QueueNotificationDto, UpsertNotificationTemplateDto } from "./dto/notifications.dto";
import { NotificationsService } from "./notifications.service";

@Controller({ path: "notifications", version: "1" })
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get("templates")
  @Permissions("notification.read")
  listTemplates(@CurrentTenant() tenant: TenantContext) {
    return this.notifications.listTemplates(tenant.companyId);
  }

  @Post("templates")
  @Permissions("notification.manage")
  upsertTemplate(@CurrentTenant() tenant: TenantContext, @Body() dto: UpsertNotificationTemplateDto) {
    return this.notifications.upsertTemplate(tenant.companyId, tenant.userId, dto);
  }

  @Post("templates/defaults")
  @Permissions("notification.manage")
  ensureDefaults(@CurrentTenant() tenant: TenantContext) {
    return this.notifications.ensureDefaultTemplates(tenant.companyId, tenant.userId);
  }

  @Get("deliveries")
  @Permissions("notification.read")
  listDeliveries(@CurrentTenant() tenant: TenantContext) {
    return this.notifications.listDeliveries(tenant.companyId);
  }

  @Post("deliveries")
  @Permissions("notification.manage")
  queue(@CurrentTenant() tenant: TenantContext, @Body() dto: QueueNotificationDto) {
    return this.notifications.queue(tenant.companyId, tenant.userId, dto);
  }

  @Post("dispatch")
  @Permissions("notification.manage")
  dispatch(@CurrentTenant() tenant: TenantContext) {
    return this.notifications.dispatchQueued(tenant.companyId);
  }
}


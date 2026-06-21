import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentTenant } from "../../shared/auth/tenant.decorator";
import { TenantContext } from "../../shared/auth/auth.types";
import { IdempotencyService } from "../../shared/idempotency/idempotency.service";
import { Permissions } from "../../shared/rbac/permissions.decorator";
import { CollectionsService } from "./collections.service";
import { AllocatePromisePaymentDto, CreateFollowUpDto, CreatePromiseDto, UpdateFollowUpDto, UpdatePromiseDto } from "./dto/collections.dto";

@Controller({ path: "collections", version: "1" })
export class CollectionsController {
  constructor(private readonly collections: CollectionsService, private readonly idempotency: IdempotencyService) {}

  @Get("follow-ups")
  @Permissions("collections.read")
  listFollowUps(@CurrentTenant() tenant: TenantContext) {
    return this.collections.listFollowUps(tenant.companyId);
  }

  @Post("follow-ups")
  @Permissions("collections.create")
  createFollowUp(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateFollowUpDto, @Headers("idempotency-key") key?: string) {
    return this.idempotency.run({
      companyId: tenant.companyId,
      key,
      endpoint: "POST /v1/collections/follow-ups",
      payload: dto,
      handler: () => this.collections.createFollowUp(tenant.companyId, tenant.userId, dto)
    });
  }

  @Get("follow-ups/:id")
  @Permissions("collections.read")
  getFollowUp(@CurrentTenant() tenant: TenantContext, @Param("id") id: string) {
    return this.collections.getFollowUp(tenant.companyId, id);
  }

  @Patch("follow-ups/:id")
  @Permissions("collections.update")
  updateFollowUp(@CurrentTenant() tenant: TenantContext, @Param("id") id: string, @Body() dto: UpdateFollowUpDto) {
    return this.collections.updateFollowUp(tenant.companyId, tenant.userId, id, dto);
  }

  @Post("follow-ups/:id/cancel")
  @Permissions("collections.update")
  cancelFollowUp(@CurrentTenant() tenant: TenantContext, @Param("id") id: string) {
    return this.collections.cancelFollowUp(tenant.companyId, tenant.userId, id);
  }

  @Get("promises")
  @Permissions("collections.read")
  listPromises(@CurrentTenant() tenant: TenantContext, @Query("partyId") partyId?: string) {
    return this.collections.listPromises(tenant.companyId, partyId);
  }

  @Post("promises")
  @Permissions("collections.create")
  createPromise(@CurrentTenant() tenant: TenantContext, @Body() dto: CreatePromiseDto, @Headers("idempotency-key") key?: string) {
    return this.idempotency.run({
      companyId: tenant.companyId,
      key,
      endpoint: "POST /v1/collections/promises",
      payload: dto,
      handler: () => this.collections.createPromise(tenant.companyId, tenant.userId, dto)
    });
  }

  @Get("promises/:id")
  @Permissions("collections.read")
  getPromise(@CurrentTenant() tenant: TenantContext, @Param("id") id: string) {
    return this.collections.getPromise(tenant.companyId, id);
  }

  @Patch("promises/:id")
  @Permissions("collections.update")
  updatePromise(@CurrentTenant() tenant: TenantContext, @Param("id") id: string, @Body() dto: UpdatePromiseDto) {
    return this.collections.updatePromise(tenant.companyId, tenant.userId, id, dto);
  }

  @Post("promises/:id/allocations")
  @Permissions("collections.update")
  allocatePromisePayment(@CurrentTenant() tenant: TenantContext, @Param("id") id: string, @Body() dto: AllocatePromisePaymentDto) {
    return this.collections.allocatePromisePayment(tenant.companyId, tenant.userId, id, dto);
  }

  @Post("promises/:id/detect-fulfillment")
  @Permissions("collections.update")
  detectFulfillment(@CurrentTenant() tenant: TenantContext, @Param("id") id: string) {
    return this.collections.detectFulfillment(tenant.companyId, tenant.userId, id);
  }

  @Post("promises/detect-breaches")
  @Permissions("collections.update")
  detectBreaches(@CurrentTenant() tenant: TenantContext) {
    return this.collections.detectBreaches(tenant.companyId, tenant.userId);
  }

  @Get("customers/:partyId/reliability")
  @Permissions("collections.read")
  reliability(@CurrentTenant() tenant: TenantContext, @Param("partyId") partyId: string) {
    return this.collections.reliability(tenant.companyId, partyId);
  }

  @Get("dashboard")
  @Permissions("collections.read")
  dashboard(@CurrentTenant() tenant: TenantContext) {
    return this.collections.dashboard(tenant.companyId);
  }
}

import { Controller, Get, Param, Post } from "@nestjs/common";
import { CurrentTenant } from "../../shared/auth/tenant.decorator";
import { TenantContext } from "../../shared/auth/auth.types";
import { Permissions } from "../../shared/rbac/permissions.decorator";
import { CreditIntelligenceService } from "./credit-intelligence.service";

@Controller({ path: "credit-intelligence", version: "1" })
export class CreditIntelligenceController {
  constructor(private readonly credit: CreditIntelligenceService) {}

  @Get("overview")
  @Permissions("credit.read")
  overview(@CurrentTenant() tenant: TenantContext) {
    return this.credit.overview(tenant.companyId);
  }

  @Get("customers")
  @Permissions("credit.read")
  customers(@CurrentTenant() tenant: TenantContext) {
    return this.credit.customers(tenant.companyId);
  }

  @Post("customers/:partyId/refresh-profile")
  @Permissions("credit.score")
  refreshProfile(@CurrentTenant() tenant: TenantContext, @Param("partyId") partyId: string) {
    return this.credit.refreshProfile(tenant.companyId, tenant.userId, partyId);
  }

  @Post("customers/:partyId/score")
  @Permissions("credit.score")
  recomputeScore(@CurrentTenant() tenant: TenantContext, @Param("partyId") partyId: string) {
    return this.credit.recomputeScore(tenant.companyId, tenant.userId, partyId);
  }
}


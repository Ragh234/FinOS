import { Body, Controller, Get, Headers, Param, Post, Query } from "@nestjs/common";
import { CurrentTenant } from "../../shared/auth/tenant.decorator";
import { TenantContext } from "../../shared/auth/auth.types";
import { IdempotencyService } from "../../shared/idempotency/idempotency.service";
import { Permissions } from "../../shared/rbac/permissions.decorator";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";
import { ReversalDto } from "../shared/dto/reversal.dto";
import { SalesService } from "./sales.service";

@Controller({ path: "sales/invoices", version: "1" })
export class SalesController {
  constructor(private readonly sales: SalesService, private readonly idempotency: IdempotencyService) {}

  @Get()
  @Permissions("sales.read")
  list(@CurrentTenant() tenant: TenantContext) {
    return this.sales.list(tenant.companyId);
  }

  @Post()
  @Permissions("sales.create")
  create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateInvoiceDto, @Headers("idempotency-key") key?: string) {
    return this.idempotency.run({
      companyId: tenant.companyId,
      key,
      endpoint: "POST /v1/sales/invoices",
      payload: dto,
      handler: () => this.sales.create(tenant.companyId, tenant.userId, dto)
    });
  }

  @Get(":id")
  @Permissions("sales.read")
  get(@CurrentTenant() tenant: TenantContext, @Param("id") id: string) {
    return this.sales.get(tenant.companyId, id);
  }

  @Post(":id/post")
  @Permissions("sales.post")
  post(@CurrentTenant() tenant: TenantContext, @Param("id") id: string, @Query("locationId") locationId?: string) {
    return this.sales.post(tenant.companyId, tenant.userId, id, locationId);
  }

  @Post(":id/reverse")
  @Permissions("sales.post")
  reverse(@CurrentTenant() tenant: TenantContext, @Param("id") id: string, @Body() dto: ReversalDto, @Headers("idempotency-key") key?: string) {
    return this.idempotency.run({
      companyId: tenant.companyId,
      key,
      endpoint: "POST /v1/sales/invoices/:id/reverse",
      payload: { id, ...dto },
      handler: () => this.sales.reverse(tenant.companyId, tenant.userId, id, dto.reason)
    });
  }
}

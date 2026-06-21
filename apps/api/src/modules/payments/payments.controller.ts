import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { CurrentTenant } from "../../shared/auth/tenant.decorator";
import { TenantContext } from "../../shared/auth/auth.types";
import { IdempotencyService } from "../../shared/idempotency/idempotency.service";
import { Permissions } from "../../shared/rbac/permissions.decorator";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { ReversalDto } from "../shared/dto/reversal.dto";
import { PaymentsService } from "./payments.service";

@Controller({ path: "payments", version: "1" })
export class PaymentsController {
  constructor(private readonly payments: PaymentsService, private readonly idempotency: IdempotencyService) {}

  @Get()
  @Permissions("payment.read")
  list(@CurrentTenant() tenant: TenantContext) {
    return this.payments.list(tenant.companyId);
  }

  @Post()
  @Permissions("payment.create")
  create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreatePaymentDto, @Headers("idempotency-key") key?: string) {
    return this.idempotency.run({
      companyId: tenant.companyId,
      key,
      endpoint: "POST /v1/payments",
      payload: dto,
      handler: () => this.payments.create(tenant.companyId, tenant.userId, dto)
    });
  }

  @Get(":id")
  @Permissions("payment.read")
  get(@CurrentTenant() tenant: TenantContext, @Param("id") id: string) {
    return this.payments.get(tenant.companyId, id);
  }

  @Post(":id/reverse")
  @Permissions("payment.create")
  reverse(@CurrentTenant() tenant: TenantContext, @Param("id") id: string, @Body() dto: ReversalDto, @Headers("idempotency-key") key?: string) {
    return this.idempotency.run({
      companyId: tenant.companyId,
      key,
      endpoint: "POST /v1/payments/:id/reverse",
      payload: { id, ...dto },
      handler: () => this.payments.reverse(tenant.companyId, tenant.userId, id, dto.reason)
    });
  }
}

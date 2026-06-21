import { Body, Controller, Get, Post } from "@nestjs/common";
import { CurrentTenant } from "../../shared/auth/tenant.decorator";
import { TenantContext } from "../../shared/auth/auth.types";
import { Permissions } from "../../shared/rbac/permissions.decorator";
import { AiCfoService } from "./ai-cfo.service";
import { AskAiCfoDto } from "./dto/ask-ai-cfo.dto";

@Controller({ path: "ai-cfo", version: "1" })
export class AiCfoController {
  constructor(private readonly aiCfo: AiCfoService) {}

  @Post("ask")
  @Permissions("ai-cfo.ask")
  ask(@CurrentTenant() tenant: TenantContext, @Body() dto: AskAiCfoDto) {
    return this.aiCfo.ask(tenant.companyId, tenant.userId, dto.question);
  }

  @Get("history")
  @Permissions("ai-cfo.ask")
  history(@CurrentTenant() tenant: TenantContext) {
    return this.aiCfo.history(tenant.companyId, tenant.userId);
  }
}

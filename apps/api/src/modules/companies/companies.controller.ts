import { Body, Controller, Get, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import { CurrentTenant } from "../../shared/auth/tenant.decorator";
import { AuthenticatedUser, TenantContext } from "../../shared/auth/auth.types";
import { Permissions } from "../../shared/rbac/permissions.decorator";
import { CompaniesService } from "./companies.service";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";

@Controller({ path: "companies", version: "1" })
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCompanyDto) {
    return this.companies.create(user.userId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.companies.listForUser(user.userId);
  }

  @Get("current")
  @Permissions("company.read")
  current(@CurrentTenant() tenant: TenantContext) {
    return this.companies.get(tenant.companyId);
  }

  @Patch("current")
  @Permissions("company.update")
  updateCurrent(@CurrentTenant() tenant: TenantContext, @Body() dto: UpdateCompanyDto) {
    return this.companies.update(tenant.companyId, dto);
  }

  @Get("current/members")
  @Permissions("rbac.members.read")
  members(@CurrentTenant() tenant: TenantContext) {
    return this.companies.members(tenant.companyId);
  }
}

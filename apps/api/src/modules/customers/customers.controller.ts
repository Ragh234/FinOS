import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentTenant } from "../../shared/auth/tenant.decorator";
import { TenantContext } from "../../shared/auth/auth.types";
import { Permissions } from "../../shared/rbac/permissions.decorator";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { ListCustomersDto } from "./dto/list-customers.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { CustomersService } from "./customers.service";

@Controller({ path: "customers", version: "1" })
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @Permissions("customer.read")
  list(@CurrentTenant() tenant: TenantContext, @Query() query: ListCustomersDto) {
    return this.customers.list(tenant.companyId, query);
  }

  @Post()
  @Permissions("customer.create")
  create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateCustomerDto) {
    return this.customers.create(tenant.companyId, dto);
  }

  @Get(":id")
  @Permissions("customer.read")
  get(@CurrentTenant() tenant: TenantContext, @Param("id") id: string) {
    return this.customers.get(tenant.companyId, id);
  }

  @Patch(":id")
  @Permissions("customer.update")
  update(@CurrentTenant() tenant: TenantContext, @Param("id") id: string, @Body() dto: UpdateCustomerDto) {
    return this.customers.update(tenant.companyId, id, dto);
  }

  @Delete(":id")
  @Permissions("customer.delete")
  remove(@CurrentTenant() tenant: TenantContext, @Param("id") id: string) {
    return this.customers.remove(tenant.companyId, id);
  }
}

import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { CurrentTenant } from "../../shared/auth/tenant.decorator";
import { TenantContext } from "../../shared/auth/auth.types";
import { Permissions } from "../../shared/rbac/permissions.decorator";
import { CreateLocationDto } from "./dto/create-location.dto";
import { ListStockDto } from "./dto/list-stock.dto";
import { StockAdjustmentDto } from "./dto/stock-adjustment.dto";
import { InventoryService } from "./inventory.service";

@Controller({ path: "inventory", version: "1" })
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get("locations")
  @Permissions("inventory.read")
  locations(@CurrentTenant() tenant: TenantContext) {
    return this.inventory.locations(tenant.companyId);
  }

  @Post("locations")
  @Permissions("inventory.adjust")
  createLocation(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateLocationDto) {
    return this.inventory.createLocation(tenant.companyId, tenant.userId, dto);
  }

  @Get("balances")
  @Permissions("inventory.read")
  balances(@CurrentTenant() tenant: TenantContext, @Query() query: ListStockDto) {
    return this.inventory.balances(tenant.companyId, query);
  }

  @Get("ledger")
  @Permissions("inventory.read")
  ledger(@CurrentTenant() tenant: TenantContext, @Query() query: ListStockDto) {
    return this.inventory.ledger(tenant.companyId, query);
  }

  @Post("adjustments")
  @Permissions("inventory.adjust")
  adjust(@CurrentTenant() tenant: TenantContext, @Body() dto: StockAdjustmentDto) {
    return this.inventory.adjust(tenant.companyId, tenant.userId, dto);
  }
}

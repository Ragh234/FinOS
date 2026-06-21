import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentTenant } from "../../shared/auth/tenant.decorator";
import { TenantContext } from "../../shared/auth/auth.types";
import { Permissions } from "../../shared/rbac/permissions.decorator";
import { CreateProductDto } from "./dto/create-product.dto";
import { ListProductsDto } from "./dto/list-products.dto";
import { CreateAttributeDefinitionDto, CreateCategoryDto, CreateTaxRateDto, CreateUnitDto } from "./dto/product-master.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ProductsService } from "./products.service";

@Controller({ path: "products", version: "1" })
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @Permissions("product.read")
  list(@CurrentTenant() tenant: TenantContext, @Query() query: ListProductsDto) {
    return this.products.list(tenant.companyId, query);
  }

  @Post()
  @Permissions("product.create")
  create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateProductDto) {
    return this.products.create(tenant.companyId, tenant.userId, dto);
  }

  @Get(":id")
  @Permissions("product.read")
  get(@CurrentTenant() tenant: TenantContext, @Param("id") id: string) {
    return this.products.get(tenant.companyId, id);
  }

  @Patch(":id")
  @Permissions("product.update")
  update(@CurrentTenant() tenant: TenantContext, @Param("id") id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(tenant.companyId, tenant.userId, id, dto);
  }

  @Delete(":id")
  @Permissions("product.update")
  remove(@CurrentTenant() tenant: TenantContext, @Param("id") id: string) {
    return this.products.remove(tenant.companyId, tenant.userId, id);
  }

  @Get("master/categories")
  @Permissions("product.read")
  categories(@CurrentTenant() tenant: TenantContext) {
    return this.products.categories(tenant.companyId);
  }

  @Post("master/categories")
  @Permissions("product.create")
  createCategory(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateCategoryDto) {
    return this.products.createCategory(tenant.companyId, tenant.userId, dto);
  }

  @Get("master/units")
  @Permissions("product.read")
  units(@CurrentTenant() tenant: TenantContext) {
    return this.products.units(tenant.companyId);
  }

  @Post("master/units")
  @Permissions("product.create")
  createUnit(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateUnitDto) {
    return this.products.createUnit(tenant.companyId, tenant.userId, dto);
  }

  @Get("master/tax-rates")
  @Permissions("product.read")
  taxRates(@CurrentTenant() tenant: TenantContext) {
    return this.products.taxRates(tenant.companyId);
  }

  @Post("master/tax-rates")
  @Permissions("product.create")
  createTaxRate(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateTaxRateDto) {
    return this.products.createTaxRate(tenant.companyId, tenant.userId, dto);
  }

  @Get("master/attributes")
  @Permissions("product.read")
  attributeDefinitions(@CurrentTenant() tenant: TenantContext) {
    return this.products.attributeDefinitions(tenant.companyId);
  }

  @Post("master/attributes")
  @Permissions("product.create")
  createAttributeDefinition(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateAttributeDefinitionDto) {
    return this.products.createAttributeDefinition(tenant.companyId, tenant.userId, dto);
  }
}

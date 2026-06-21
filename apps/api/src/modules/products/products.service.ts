import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, Prisma } from "@finos/database";
import { AuditService } from "../../shared/audit/audit.service";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { ListProductsDto } from "./dto/list-products.dto";
import { CreateAttributeDefinitionDto, CreateCategoryDto, CreateTaxRateDto, CreateUnitDto } from "./dto/product-master.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ProductsRepository } from "./products.repository";

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: ProductsRepository,
    private readonly audit: AuditService
  ) {}

  async create(companyId: string, actorUserId: string, dto: CreateProductDto) {
    await this.assertReferences(companyId, dto.unitId, dto.categoryId, dto.taxRateId);
    const product = await this.prisma.product.create({
      data: {
        companyId,
        name: dto.name.trim(),
        sku: dto.sku.trim(),
        unitId: dto.unitId,
        categoryId: dto.categoryId,
        taxRateId: dto.taxRateId,
        description: dto.description,
        costPrice: dto.costPrice,
        sellingPrice: dto.sellingPrice,
        attributes: dto.attributes === undefined ? {} : (dto.attributes as Prisma.InputJsonValue),
        isInventoryItem: dto.isInventoryItem
      },
      include: { category: true, unit: true, taxRate: true }
    });
    await this.audit.record({ companyId, actorUserId, action: AuditAction.CREATE, entityType: "Product", entityId: product.id, after: product });
    return product;
  }

  async list(companyId: string, query: ListProductsDto) {
    const products = await this.repo.list(companyId, query);
    const hasNextPage = products.length > query.limit;
    const data = hasNextPage ? products.slice(0, query.limit) : products;
    return { data, pageInfo: { hasNextPage, nextCursor: hasNextPage ? data[data.length - 1]?.id : null } };
  }

  async get(companyId: string, id: string) {
    const product = await this.repo.find(companyId, id);
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }

  async update(companyId: string, actorUserId: string, id: string, dto: UpdateProductDto) {
    const before = await this.get(companyId, id);
    if (dto.unitId || dto.categoryId || dto.taxRateId) {
      await this.assertReferences(companyId, dto.unitId ?? before.unitId, dto.categoryId, dto.taxRateId);
    }
    const product = await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        sku: dto.sku?.trim(),
        unitId: dto.unitId,
        categoryId: dto.categoryId,
        taxRateId: dto.taxRateId,
        description: dto.description,
        costPrice: dto.costPrice,
        sellingPrice: dto.sellingPrice,
        attributes: dto.attributes === undefined ? undefined : (dto.attributes as Prisma.InputJsonValue),
        isInventoryItem: dto.isInventoryItem
      },
      include: { category: true, unit: true, taxRate: true }
    });
    await this.audit.record({ companyId, actorUserId, action: AuditAction.UPDATE, entityType: "Product", entityId: id, before, after: product });
    return product;
  }

  async remove(companyId: string, actorUserId: string, id: string) {
    const before = await this.get(companyId, id);
    const product = await this.prisma.product.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    await this.audit.record({ companyId, actorUserId, action: AuditAction.DELETE, entityType: "Product", entityId: id, before, after: product });
    return { id, deletedAt: product.deletedAt };
  }

  async createCategory(companyId: string, actorUserId: string, dto: CreateCategoryDto) {
    if (dto.parentId) {
      const parent = await this.prisma.productCategory.findFirst({ where: { id: dto.parentId, companyId } });
      if (!parent) throw new BadRequestException("Parent category does not belong to this company");
    }
    const category = await this.prisma.productCategory.create({ data: { companyId, name: dto.name.trim(), parentId: dto.parentId } });
    await this.audit.record({ companyId, actorUserId, action: AuditAction.CREATE, entityType: "ProductCategory", entityId: category.id, after: category });
    return category;
  }

  categories(companyId: string) {
    return this.prisma.productCategory.findMany({ where: { companyId }, orderBy: { name: "asc" } });
  }

  async createUnit(companyId: string, actorUserId: string, dto: CreateUnitDto) {
    const unit = await this.prisma.unit.create({ data: { companyId, code: dto.code.trim().toUpperCase(), name: dto.name.trim(), precision: dto.precision } });
    await this.audit.record({ companyId, actorUserId, action: AuditAction.CREATE, entityType: "Unit", entityId: unit.id, after: unit });
    return unit;
  }

  units(companyId: string) {
    return this.prisma.unit.findMany({ where: { companyId }, orderBy: { code: "asc" } });
  }

  async createTaxRate(companyId: string, actorUserId: string, dto: CreateTaxRateDto) {
    const taxRate = await this.prisma.taxRate.create({ data: { companyId, name: dto.name.trim(), rate: dto.rate } });
    await this.audit.record({ companyId, actorUserId, action: AuditAction.CREATE, entityType: "TaxRate", entityId: taxRate.id, after: taxRate });
    return taxRate;
  }

  taxRates(companyId: string) {
    return this.prisma.taxRate.findMany({ where: { companyId, isActive: true }, orderBy: { name: "asc" } });
  }

  async createAttributeDefinition(companyId: string, actorUserId: string, dto: CreateAttributeDefinitionDto) {
    const definition = await this.prisma.productAttributeDefinition.create({
      data: {
        companyId,
        name: dto.name.trim(),
        dataType: dto.dataType,
        options: dto.options === undefined ? Prisma.JsonNull : (dto.options as Prisma.InputJsonValue),
        isRequired: dto.isRequired ?? false
      }
    });
    await this.audit.record({ companyId, actorUserId, action: AuditAction.CREATE, entityType: "ProductAttributeDefinition", entityId: definition.id, after: definition });
    return definition;
  }

  attributeDefinitions(companyId: string) {
    return this.prisma.productAttributeDefinition.findMany({ where: { companyId }, orderBy: { name: "asc" } });
  }

  private async assertReferences(companyId: string, unitId: string, categoryId?: string, taxRateId?: string) {
    const unit = await this.prisma.unit.findFirst({ where: { id: unitId, companyId } });
    if (!unit) throw new BadRequestException("Unit does not belong to this company");
    if (categoryId) {
      const category = await this.prisma.productCategory.findFirst({ where: { id: categoryId, companyId } });
      if (!category) throw new BadRequestException("Category does not belong to this company");
    }
    if (taxRateId) {
      const taxRate = await this.prisma.taxRate.findFirst({ where: { id: taxRateId, companyId } });
      if (!taxRate) throw new BadRequestException("Tax rate does not belong to this company");
    }
  }
}

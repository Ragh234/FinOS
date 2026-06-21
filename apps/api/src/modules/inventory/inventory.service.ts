import { BadRequestException, Injectable } from "@nestjs/common";
import { AuditAction, Prisma, StockMovementType } from "@finos/database";
import { AuditService } from "../../shared/audit/audit.service";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { CreateLocationDto } from "./dto/create-location.dto";
import { ListStockDto } from "./dto/list-stock.dto";
import { StockAdjustmentDto } from "./dto/stock-adjustment.dto";
import { InventoryRepository } from "./inventory.repository";

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: InventoryRepository,
    private readonly audit: AuditService
  ) {}

  async createLocation(companyId: string, actorUserId: string, dto: CreateLocationDto) {
    const location = await this.prisma.inventoryLocation.create({
      data: { companyId, name: dto.name.trim(), code: dto.code.trim().toUpperCase(), address: dto.address }
    });
    await this.audit.record({ companyId, actorUserId, action: AuditAction.CREATE, entityType: "InventoryLocation", entityId: location.id, after: location });
    return location;
  }

  locations(companyId: string) {
    return this.prisma.inventoryLocation.findMany({ where: { companyId, isActive: true }, orderBy: { name: "asc" } });
  }

  balances(companyId: string, query: ListStockDto) {
    return this.repo.balances(companyId, query);
  }

  ledger(companyId: string, query: ListStockDto) {
    return this.repo.ledger(companyId, query.productId, query.locationId);
  }

  async adjust(companyId: string, actorUserId: string, dto: StockAdjustmentDto) {
    return this.postMovement(companyId, actorUserId, {
      productId: dto.productId,
      locationId: dto.locationId,
      type: StockMovementType.ADJUSTMENT,
      quantity: dto.quantity,
      unitCost: dto.unitCost,
      referenceType: "StockAdjustment",
      notes: dto.notes
    });
  }

  async postMovement(companyId: string, actorUserId: string | undefined, input: {
    productId: string;
    locationId: string;
    type: StockMovementType;
    quantity: number;
    unitCost?: number;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
  }, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const product = await client.product.findFirst({ where: { id: input.productId, companyId, deletedAt: null } });
    if (!product) throw new BadRequestException("Product does not belong to this company");
    const location = await client.inventoryLocation.findFirst({ where: { id: input.locationId, companyId, isActive: true } });
    if (!location) throw new BadRequestException("Inventory location does not belong to this company");

    const execute = async (trx: Prisma.TransactionClient) => {
      const movement = await trx.stockMovement.create({
        data: {
          companyId,
          productId: input.productId,
          locationId: input.locationId,
          type: input.type,
          quantity: input.quantity,
          unitCost: input.unitCost,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          notes: input.notes
        }
      });

      const existing = await trx.stockBalance.findUnique({
        where: { companyId_productId_locationId: { companyId, productId: input.productId, locationId: input.locationId } }
      });
      if (input.quantity < 0) {
        if (!existing) throw new BadRequestException("Stock cannot go negative");
        const updated = await trx.stockBalance.updateMany({
          where: {
            companyId,
            productId: input.productId,
            locationId: input.locationId,
            currentStock: { gte: Math.abs(input.quantity) }
          },
          data: { currentStock: { increment: input.quantity } }
        });
        if (updated.count !== 1) throw new BadRequestException("Stock cannot go negative");
      } else {
        await trx.stockBalance.upsert({
          where: { companyId_productId_locationId: { companyId, productId: input.productId, locationId: input.locationId } },
          create: { companyId, productId: input.productId, locationId: input.locationId, currentStock: input.quantity },
          update: { currentStock: { increment: input.quantity } }
        });
      }

      await this.audit.record({ companyId, actorUserId, action: AuditAction.CREATE, entityType: "StockMovement", entityId: movement.id, after: movement }, trx);
      return movement;
    };

    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async reverseMovements(companyId: string, actorUserId: string, referenceType: string, referenceId: string, reason?: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const movements = await client.stockMovement.findMany({ where: { companyId, referenceType, referenceId } });
    const execute = async (trx: Prisma.TransactionClient) => {
      const reversals = [];
      for (const movement of movements) {
        reversals.push(await this.postMovement(companyId, actorUserId, {
          productId: movement.productId,
          locationId: movement.locationId,
          type: StockMovementType.ADJUSTMENT,
          quantity: -Number(movement.quantity),
          unitCost: movement.unitCost ? Number(movement.unitCost) : undefined,
          referenceType: `${referenceType}Reversal`,
          referenceId,
          notes: reason ?? `Reversal of ${referenceType} ${referenceId}`
        }, trx));
      }
      return reversals;
    };
    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }
}

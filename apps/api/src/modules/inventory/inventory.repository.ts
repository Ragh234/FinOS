import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { ListStockDto } from "./dto/list-stock.dto";

@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  balances(companyId: string, query: ListStockDto) {
    return this.prisma.stockBalance.findMany({
      where: { companyId, productId: query.productId, locationId: query.locationId },
      include: { product: true, location: true },
      orderBy: [{ product: { name: "asc" } }]
    });
  }

  ledger(companyId: string, productId?: string, locationId?: string) {
    return this.prisma.stockMovement.findMany({
      where: { companyId, productId, locationId },
      include: { product: true, location: true },
      orderBy: { occurredAt: "desc" },
      take: 100
    });
  }
}

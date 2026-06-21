import { Injectable } from "@nestjs/common";
import { Prisma } from "@finos/database";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { ListProductsDto } from "./dto/list-products.dto";

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string, query: ListProductsDto) {
    const where: Prisma.ProductWhereInput = {
      companyId,
      deletedAt: null,
      categoryId: query.categoryId,
      OR: query.search
        ? [
            { name: { contains: query.search, mode: "insensitive" } },
            { sku: { contains: query.search, mode: "insensitive" } },
            { description: { contains: query.search, mode: "insensitive" } }
          ]
        : undefined
    };

    return this.prisma.product.findMany({
      where,
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: [{ name: "asc" }, { id: "asc" }],
      include: { category: true, unit: true, taxRate: true }
    });
  }

  find(companyId: string, id: string) {
    return this.prisma.product.findFirst({
      where: { id, companyId, deletedAt: null },
      include: { category: true, unit: true, taxRate: true, stockBalances: true }
    });
  }
}

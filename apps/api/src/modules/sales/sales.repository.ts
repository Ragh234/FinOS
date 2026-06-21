import { Injectable } from "@nestjs/common";
import { InvoiceType } from "@finos/database";
import { PrismaService } from "../../shared/prisma/prisma.service";

@Injectable()
export class SalesRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.invoice.findMany({
      where: { companyId, type: InvoiceType.SALES },
      include: { party: true },
      orderBy: { issueDate: "desc" },
      take: 100
    });
  }

  find(companyId: string, id: string) {
    return this.prisma.invoice.findFirst({
      where: { companyId, id, type: InvoiceType.SALES },
      include: { party: true, lines: { include: { product: true } }, journalEntries: true }
    });
  }
}

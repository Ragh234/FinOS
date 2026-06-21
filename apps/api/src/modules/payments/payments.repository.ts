import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../shared/prisma/prisma.service";

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.payment.findMany({
      where: { companyId },
      include: { party: true, allocations: { include: { invoice: true } } },
      orderBy: { paymentDate: "desc" },
      take: 100
    });
  }

  find(companyId: string, id: string) {
    return this.prisma.payment.findFirst({
      where: { companyId, id },
      include: { party: true, allocations: { include: { invoice: true } }, journalEntries: true }
    });
  }
}

import { Injectable } from "@nestjs/common";
import { Prisma } from "@finos/database";

@Injectable()
export class DocumentNumberService {
  async next(tx: Prisma.TransactionClient, companyId: string, documentType: string): Promise<string> {
    const sequence = await tx.documentSequence.findFirst({
      where: { companyId, documentType, isActive: true },
      orderBy: { financialYear: "desc" }
    });

    if (!sequence) {
      try {
        const fallback = await tx.documentSequence.create({
          data: { companyId, documentType, prefix: documentType.slice(0, 3).toUpperCase(), nextNumber: 2 }
        });
        return this.format(fallback.prefix, 1, fallback.padding);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          return this.next(tx, companyId, documentType);
        }
        throw error;
      }
    }

    const updated = await tx.documentSequence.update({
      where: { id: sequence.id },
      data: { nextNumber: { increment: 1 } }
    });
    return this.format(updated.prefix, updated.nextNumber - 1, updated.padding);
  }

  private format(prefix: string, nextNumber: number, padding: number) {
    return `${prefix}-${String(nextNumber).padStart(padding, "0")}`;
  }
}

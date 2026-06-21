import { Injectable } from "@nestjs/common";
import { AuditAction, Prisma } from "@finos/database";
import { PrismaService } from "../prisma/prisma.service";

type AuditInput = {
  companyId: string;
  actorUserId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    await client.auditLog.create({
      data: {
        companyId: input.companyId,
        actorUserId: input.actorUserId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        before: input.before === undefined ? Prisma.JsonNull : (input.before as Prisma.InputJsonValue),
        after: input.after === undefined ? Prisma.JsonNull : (input.after as Prisma.InputJsonValue)
      }
    });
  }
}

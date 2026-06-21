import { ConflictException, Injectable } from "@nestjs/common";
import { Prisma } from "@finos/database";
import { createHash } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async run<T>(input: {
    companyId: string;
    key?: string;
    endpoint: string;
    payload: unknown;
    handler: () => Promise<T>;
  }): Promise<T> {
    if (!input.key) return input.handler();

    const requestHash = this.hash(input.payload);
    try {
      await this.prisma.idempotencyKey.create({
        data: {
          companyId: input.companyId,
          key: input.key,
          endpoint: input.endpoint,
          requestHash
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await this.prisma.idempotencyKey.findUniqueOrThrow({
          where: { companyId_endpoint_key: { companyId: input.companyId, endpoint: input.endpoint, key: input.key } }
        });
        if (existing.requestHash !== requestHash) {
          throw new ConflictException("Idempotency key was already used with a different request payload");
        }
        if (existing.responsePayload === null) {
          throw new ConflictException("Idempotent request is already in progress");
        }
        return existing.responsePayload as T;
      }
      throw error;
    }

    try {
      const response = await input.handler();
      await this.prisma.idempotencyKey.update({
        where: { companyId_endpoint_key: { companyId: input.companyId, endpoint: input.endpoint, key: input.key } },
        data: { responsePayload: response as Prisma.InputJsonValue }
      });
      return response;
    } catch (error) {
      await this.prisma.idempotencyKey.delete({
        where: { companyId_endpoint_key: { companyId: input.companyId, endpoint: input.endpoint, key: input.key } }
      }).catch(() => undefined);
      throw error;
    }
  }

  private hash(payload: unknown) {
    return createHash("sha256").update(this.stableStringify(payload)).digest("hex");
  }

  private stableStringify(value: unknown): string {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map((item) => this.stableStringify(item)).join(",")}]`;
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${this.stableStringify(record[key])}`).join(",")}}`;
  }
}

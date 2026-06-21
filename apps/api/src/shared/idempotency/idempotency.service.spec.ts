import { ConflictException } from "@nestjs/common";
import { Prisma } from "@finos/database";
import { IdempotencyService } from "./idempotency.service";

describe("IdempotencyService", () => {
  it("returns cached response for the same key and same request hash", async () => {
    const response = { id: "invoice_1" };
    const prisma = {
      idempotencyKey: {
        create: jest.fn().mockRejectedValue(new Prisma.PrismaClientKnownRequestError("Unique", { code: "P2002", clientVersion: "test" })),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ requestHash: expect.any(String), responsePayload: response })
      }
    };
    const service = new IdempotencyService(prisma as never);
    const firstHash = (service as unknown as { hash: (payload: unknown) => string }).hash({ amount: 10 });
    prisma.idempotencyKey.findUniqueOrThrow.mockResolvedValue({ requestHash: firstHash, responsePayload: response });

    await expect(service.run({ companyId: "company_1", key: "key_1", endpoint: "POST /x", payload: { amount: 10 }, handler: jest.fn() })).resolves.toEqual(response);
  });

  it("rejects same key with a different payload", async () => {
    const prisma = {
      idempotencyKey: {
        create: jest.fn().mockRejectedValue(new Prisma.PrismaClientKnownRequestError("Unique", { code: "P2002", clientVersion: "test" })),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ requestHash: "different", responsePayload: { id: "old" } })
      }
    };
    const service = new IdempotencyService(prisma as never);

    await expect(service.run({ companyId: "company_1", key: "key_1", endpoint: "POST /x", payload: { amount: 10 }, handler: jest.fn() })).rejects.toBeInstanceOf(ConflictException);
  });
});


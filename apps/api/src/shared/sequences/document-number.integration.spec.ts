import { PrismaClient } from "@finos/database";
import { DocumentNumberService } from "./document-number.service";

const runIfDatabase = process.env.TEST_DATABASE_URL ? describe : describe.skip;

runIfDatabase("DocumentNumberService integration", () => {
  const prisma = new PrismaClient({ datasourceUrl: process.env.TEST_DATABASE_URL });
  const service = new DocumentNumberService();
  const companyId = `company_seq_${Date.now()}`;

  beforeAll(async () => {
    await prisma.company.create({
      data: {
        id: companyId,
        name: "Sequence Test Co",
        financialYearStart: new Date("2026-04-01")
      }
    });
  });

  afterAll(async () => {
    await prisma.documentSequence.deleteMany({ where: { companyId } });
    await prisma.company.deleteMany({ where: { id: companyId } });
    await prisma.$disconnect();
  });

  it("allocates unique document numbers under concurrent transactions", async () => {
    const numbers = await Promise.all(
      Array.from({ length: 5 }, () =>
        prisma.$transaction((tx) => service.next(tx, companyId, "SALES_INVOICE"))
      )
    );

    expect(new Set(numbers).size).toBe(numbers.length);
  });
});

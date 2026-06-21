import {
  DocumentStatus,
  InvoiceType,
  PartyType,
  PaymentDirection,
  PaymentStatus,
  PrismaClient,
  PromiseToPayStatus,
  StockMovementType
} from "@finos/database";

const runIfDatabase = process.env.TEST_DATABASE_URL ? describe : describe.skip;

runIfDatabase("Production hardening PostgreSQL concurrency", () => {
  const prisma = new PrismaClient({ datasourceUrl: process.env.TEST_DATABASE_URL });
  const companyId = `company_hardening_${Date.now()}`;
  const partyId = `party_hardening_${Date.now()}`;

  beforeAll(async () => {
    await prisma.company.create({ data: { id: companyId, name: "Hardening Test Co", financialYearStart: new Date("2026-04-01") } });
    await prisma.party.create({ data: { id: partyId, companyId, type: PartyType.CUSTOMER, name: "Hardening Customer" } });
  });

  afterAll(async () => {
    await prisma.payment.deleteMany({ where: { companyId } });
    await prisma.invoice.deleteMany({ where: { companyId } });
    await prisma.promiseToPay.deleteMany({ where: { companyId } });
    await prisma.stockBalance.deleteMany({ where: { companyId } });
    await prisma.stockMovement.deleteMany({ where: { companyId } });
    await prisma.product.deleteMany({ where: { companyId } });
    await prisma.unit.deleteMany({ where: { companyId } });
    await prisma.inventoryLocation.deleteMany({ where: { companyId } });
    await prisma.party.deleteMany({ where: { companyId } });
    await prisma.company.deleteMany({ where: { id: companyId } });
    await prisma.$disconnect();
  });

  it("payments: only one concurrent allocation can consume the same invoice due amount", async () => {
    const invoice = await prisma.invoice.create({
      data: {
        companyId,
        partyId,
        type: InvoiceType.SALES,
        number: `INV-${Date.now()}`,
        issueDate: new Date(),
        total: 100,
        amountDue: 100,
        currency: "INR"
      }
    });

    const attempts = await Promise.all([
      prisma.invoice.updateMany({ where: { id: invoice.id, companyId, amountDue: { gte: 100 }, status: { not: DocumentStatus.VOID } }, data: { amountPaid: { increment: 100 }, amountDue: { decrement: 100 } } }),
      prisma.invoice.updateMany({ where: { id: invoice.id, companyId, amountDue: { gte: 100 }, status: { not: DocumentStatus.VOID } }, data: { amountPaid: { increment: 100 }, amountDue: { decrement: 100 } } })
    ]);

    expect(attempts.filter((attempt) => attempt.count === 1)).toHaveLength(1);
    const refreshed = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(Number(refreshed.amountDue)).toBe(0);
  });

  it("inventory: concurrent decrements cannot make stock negative", async () => {
    const unit = await prisma.unit.create({ data: { companyId, code: `U${Date.now()}`, name: "Unit" } });
    const product = await prisma.product.create({ data: { companyId, unitId: unit.id, sku: `SKU-${Date.now()}`, name: "Item" } });
    const location = await prisma.inventoryLocation.create({ data: { companyId, code: `L${Date.now()}`, name: "Main" } });
    await prisma.stockBalance.create({ data: { companyId, productId: product.id, locationId: location.id, currentStock: 5 } });

    const attempts = await Promise.all([
      prisma.stockBalance.updateMany({ where: { companyId, productId: product.id, locationId: location.id, currentStock: { gte: 4 } }, data: { currentStock: { increment: -4 } } }),
      prisma.stockBalance.updateMany({ where: { companyId, productId: product.id, locationId: location.id, currentStock: { gte: 4 } }, data: { currentStock: { increment: -4 } } })
    ]);

    expect(attempts.filter((attempt) => attempt.count === 1)).toHaveLength(1);
    const balance = await prisma.stockBalance.findUniqueOrThrow({ where: { companyId_productId_locationId: { companyId, productId: product.id, locationId: location.id } } });
    expect(Number(balance.currentStock)).toBeGreaterThanOrEqual(0);
  });

  it("promises: concurrent allocations cannot exceed promised amount", async () => {
    const promise = await prisma.promiseToPay.create({ data: { companyId, partyId, promisedAmount: 100, promisedDate: new Date() } });
    const attempts = await Promise.all([
      prisma.promiseToPay.updateMany({ where: { companyId, id: promise.id, status: { notIn: [PromiseToPayStatus.BROKEN, PromiseToPayStatus.CANCELLED] }, paidAmount: { lte: 40 } }, data: { paidAmount: { increment: 60 } } }),
      prisma.promiseToPay.updateMany({ where: { companyId, id: promise.id, status: { notIn: [PromiseToPayStatus.BROKEN, PromiseToPayStatus.CANCELLED] }, paidAmount: { lte: 40 } }, data: { paidAmount: { increment: 60 } } })
    ]);

    expect(attempts.filter((attempt) => attempt.count === 1)).toHaveLength(1);
    const refreshed = await prisma.promiseToPay.findUniqueOrThrow({ where: { id: promise.id } });
    expect(Number(refreshed.paidAmount)).toBeLessThanOrEqual(100);
  });

  it("reversals: only one concurrent reversal can claim a posted payment", async () => {
    const payment = await prisma.payment.create({
      data: {
        companyId,
        partyId,
        direction: PaymentDirection.IN,
        number: `PAY-${Date.now()}`,
        paymentDate: new Date(),
        amount: 100,
        method: "BANK"
      }
    });
    const attempts = await Promise.all([
      prisma.payment.updateMany({ where: { id: payment.id, companyId, status: PaymentStatus.POSTED }, data: { status: PaymentStatus.VOID } }),
      prisma.payment.updateMany({ where: { id: payment.id, companyId, status: PaymentStatus.POSTED }, data: { status: PaymentStatus.VOID } })
    ]);

    expect(attempts.filter((attempt) => attempt.count === 1)).toHaveLength(1);
  });

  it("stock movement enum remains available for service-level hardening tests", () => {
    expect(StockMovementType.ADJUSTMENT).toBe("ADJUSTMENT");
  });
});

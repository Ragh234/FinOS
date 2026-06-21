import { ProductsService } from "./products.service";

describe("ProductsService", () => {
  it("creates tenant-scoped products and audit records", async () => {
    const prisma = {
      unit: { findFirst: jest.fn().mockResolvedValue({ id: "unit_1" }) },
      product: { create: jest.fn().mockResolvedValue({ id: "prod_1", companyId: "company_1" }) }
    };
    const repo = {};
    const audit = { record: jest.fn() };
    const service = new ProductsService(prisma as never, repo as never, audit as never);

    await service.create("company_1", "user_1", {
      name: "Widget",
      sku: "W-1",
      unitId: "unit_1",
      costPrice: 10,
      sellingPrice: 15,
      isInventoryItem: true
    });

    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ companyId: "company_1", sku: "W-1" }) })
    );
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ companyId: "company_1", entityType: "Product" }));
  });
});

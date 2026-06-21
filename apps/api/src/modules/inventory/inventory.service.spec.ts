import { BadRequestException } from "@nestjs/common";
import { StockMovementType } from "@finos/database";
import { InventoryService } from "./inventory.service";

describe("InventoryService", () => {
  it("prevents negative stock balances", async () => {
    const tx = {
      product: { findFirst: jest.fn().mockResolvedValue({ id: "prod_1" }) },
      inventoryLocation: { findFirst: jest.fn().mockResolvedValue({ id: "loc_1" }) },
      stockMovement: { create: jest.fn().mockResolvedValue({ id: "move_1" }) },
      stockBalance: {
        findUnique: jest.fn().mockResolvedValue({ currentStock: 2 }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        upsert: jest.fn()
      },
      auditLog: { create: jest.fn() }
    };
    const prisma = {
      product: tx.product,
      inventoryLocation: tx.inventoryLocation,
      $transaction: jest.fn((callback) => callback(tx))
    };
    const service = new InventoryService(prisma as never, {} as never, { record: jest.fn() } as never);

    await expect(
      service.postMovement("company_1", "user_1", {
        productId: "prod_1",
        locationId: "loc_1",
        type: StockMovementType.SALES_ISSUE,
        quantity: -3
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.stockBalance.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ companyId: "company_1", productId: "prod_1", locationId: "loc_1", currentStock: { gte: 3 } }),
      data: { currentStock: { increment: -3 } }
    }));
  });
});

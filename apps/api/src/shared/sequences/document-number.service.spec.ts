import { DocumentNumberService } from "./document-number.service";

describe("DocumentNumberService", () => {
  it("formats the number from the atomically incremented sequence row", async () => {
    const tx = {
      documentSequence: {
        findFirst: jest.fn().mockResolvedValue({ id: "seq_1", prefix: "INV", nextNumber: 7, padding: 5 }),
        update: jest.fn().mockResolvedValue({ id: "seq_1", prefix: "INV", nextNumber: 8, padding: 5 })
      }
    };
    const service = new DocumentNumberService();

    await expect(service.next(tx as never, "company_1", "SALES_INVOICE")).resolves.toBe("INV-00007");
    expect(tx.documentSequence.update).toHaveBeenCalledWith({
      where: { id: "seq_1" },
      data: { nextNumber: { increment: 1 } }
    });
  });
});

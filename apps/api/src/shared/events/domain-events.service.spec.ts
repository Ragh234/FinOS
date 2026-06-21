import { DomainEventsService } from "./domain-events.service";

describe("DomainEventsService", () => {
  it("writes domain events to the transactional outbox", async () => {
    const prisma = { outboxEvent: { create: jest.fn().mockResolvedValue({ id: "outbox_1" }) } };
    const service = new DomainEventsService(prisma as never);
    const event = {
      id: "InvoiceCreated:company_1:Invoice:invoice_1:1",
      name: "InvoiceCreated" as const,
      companyId: "company_1",
      entityType: "Invoice",
      entityId: "invoice_1",
      occurredAt: new Date().toISOString(),
      payload: { partyId: "party_1" }
    };

    await service.publish(event);

    expect(prisma.outboxEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: "company_1",
        eventType: "InvoiceCreated",
        aggregateType: "Invoice",
        aggregateId: "invoice_1",
        payload: event
      })
    });
  });
});

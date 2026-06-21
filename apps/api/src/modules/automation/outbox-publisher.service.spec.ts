import { OutboxEventStatus } from "@finos/database";
import { OutboxPublisherService } from "./outbox-publisher.service";

describe("OutboxPublisherService", () => {
  it("claims, publishes, and marks outbox events processed", async () => {
    const event = { id: "outbox_1", companyId: "company_1", eventType: "InvoiceCreated", aggregateType: "Invoice", aggregateId: "invoice_1", payload: { id: "event_1" } };
    const prisma = {
      outboxEvent: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(event),
        update: jest.fn().mockResolvedValue({ ...event, status: OutboxEventStatus.PROCESSED })
      }
    };
    const bullmq = { add: jest.fn().mockResolvedValue({ id: "job_1" }) };
    const service = new OutboxPublisherService(prisma as never, bullmq as never);

    await service.processOne("outbox_1");

    expect(bullmq.add).toHaveBeenCalledWith("domain-events", "InvoiceCreated", event.payload, { jobId: "outbox:outbox_1" });
    expect(prisma.outboxEvent.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: OutboxEventStatus.PROCESSED }) }));
  });
});


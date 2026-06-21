import { NotificationChannel, NotificationStatus } from "@finos/database";
import { EmailNotificationProvider, InAppNotificationProvider, WhatsAppNotificationProvider } from "./notification-providers";
import { NotificationsService } from "./notifications.service";

describe("NotificationsService", () => {
  it("queues rendered notifications and schedules dispatch", async () => {
    const template = { id: "template_1", code: "credit_limit_warning", channel: NotificationChannel.IN_APP, body: "{{customerName}} hit {{utilizationPercent}}%", subject: "Warning {{customerName}}" };
    const delivery = { id: "delivery_1", companyId: "company_1", status: NotificationStatus.QUEUED };
    const prisma = {
      notificationTemplate: { findFirst: jest.fn().mockResolvedValue(template) },
      notificationDelivery: { create: jest.fn().mockResolvedValue(delivery) }
    };
    const audit = { record: jest.fn() };
    const bullmq = { add: jest.fn() };
    const service = new NotificationsService(
      prisma as never,
      audit as never,
      bullmq as never,
      new InAppNotificationProvider(),
      new EmailNotificationProvider(),
      new WhatsAppNotificationProvider()
    );

    await service.queue("company_1", "user_1", {
      templateCode: "credit_limit_warning",
      channel: NotificationChannel.IN_APP,
      destination: "in-app",
      variables: { customerName: "Acme", utilizationPercent: 120 }
    });

    expect(prisma.notificationDelivery.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ subject: "Warning Acme", body: "Acme hit 120%" })
    }));
    expect(bullmq.add).toHaveBeenCalledWith("notifications", "notifications.dispatch", { companyId: "company_1", deliveryId: "delivery_1" }, { jobId: "notifications.dispatch:delivery_1" });
  });

  it("dispatches queued in-app notifications idempotently by delivery id", async () => {
    const prisma = {
      notificationDelivery: {
        findMany: jest.fn().mockResolvedValue([{ id: "delivery_1", channel: NotificationChannel.IN_APP, destination: "in-app", subject: "Hi", body: "Body" }]),
        update: jest.fn().mockResolvedValue({ id: "delivery_1", status: NotificationStatus.SENT })
      }
    };
    const service = new NotificationsService(
      prisma as never,
      {} as never,
      {} as never,
      new InAppNotificationProvider(),
      new EmailNotificationProvider(),
      new WhatsAppNotificationProvider()
    );

    await service.dispatchQueued("company_1", "delivery_1");

    expect(prisma.notificationDelivery.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ companyId: "company_1", id: "delivery_1", status: NotificationStatus.QUEUED }) }));
    expect(prisma.notificationDelivery.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: NotificationStatus.SENT, provider: "in-app" }) }));
  });
});


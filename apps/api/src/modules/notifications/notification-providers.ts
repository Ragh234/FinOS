import { Injectable } from "@nestjs/common";
import { NotificationChannel } from "@finos/database";

export type NotificationMessage = {
  deliveryId: string;
  companyId: string;
  destination: string;
  subject?: string | null;
  body: string;
};

export interface NotificationProvider {
  readonly channel: NotificationChannel;
  send(message: NotificationMessage): Promise<{ provider: string; providerMessageId?: string }>;
}

@Injectable()
export class InAppNotificationProvider implements NotificationProvider {
  readonly channel = NotificationChannel.IN_APP;

  async send(message: NotificationMessage) {
    return { provider: "in-app", providerMessageId: message.deliveryId };
  }
}

@Injectable()
export class EmailNotificationProvider implements NotificationProvider {
  readonly channel = NotificationChannel.EMAIL;

  async send(message: NotificationMessage) {
    return { provider: "email-null", providerMessageId: `email-${message.deliveryId}` };
  }
}

@Injectable()
export class WhatsAppNotificationProvider implements NotificationProvider {
  readonly channel = NotificationChannel.WHATSAPP;

  async send(message: NotificationMessage) {
    return { provider: "whatsapp-null", providerMessageId: `whatsapp-${message.deliveryId}` };
  }
}


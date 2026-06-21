export const QUEUES = {
  domainEvents: "domain-events",
  credit: "credit-intelligence",
  collections: "collections",
  notifications: "notifications"
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

export type CreditJob =
  | { name: "credit.profile.refresh"; data: { companyId: string; partyId: string; actorUserId?: string } }
  | { name: "credit.risk.refresh"; data: { companyId: string; partyId: string; actorUserId?: string } };

export type CollectionsJob =
  | { name: "collections.promise.detect-breaches"; data: { companyId: string; actorUserId?: string; asOf?: string } }
  | { name: "collections.dashboard.refresh"; data: { companyId: string } };

export type NotificationJob =
  | { name: "notifications.dispatch"; data: { companyId: string; deliveryId?: string } };


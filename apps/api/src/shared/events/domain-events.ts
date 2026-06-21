export type DomainEventName =
  | "InvoiceCreated"
  | "InvoicePosted"
  | "InvoiceReversed"
  | "PaymentCreated"
  | "PaymentAllocated"
  | "PaymentReversed"
  | "PromiseCreated"
  | "PromiseBroken"
  | "PromiseHonored"
  | "RiskScoreUpdated"
  | "CreditLimitExceeded";

export type DomainEvent = {
  id: string;
  name: DomainEventName;
  companyId: string;
  actorUserId?: string;
  entityType: string;
  entityId: string;
  occurredAt: string;
  payload: Record<string, unknown>;
};

export function makeEvent(input: Omit<DomainEvent, "id" | "occurredAt"> & { occurredAt?: Date }) {
  const occurredAt = input.occurredAt ?? new Date();
  return {
    ...input,
    id: `${input.name}:${input.companyId}:${input.entityType}:${input.entityId}:${occurredAt.getTime()}`,
    occurredAt: occurredAt.toISOString()
  };
}


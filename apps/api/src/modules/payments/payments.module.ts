import { Module } from "@nestjs/common";
import { EventsModule } from "../../shared/events/events.module";
import { IdempotencyModule } from "../../shared/idempotency/idempotency.module";
import { AccountingModule } from "../accounting/accounting.module";
import { PaymentsController } from "./payments.controller";
import { PaymentsRepository } from "./payments.repository";
import { PaymentsService } from "./payments.service";

@Module({
  imports: [AccountingModule, EventsModule, IdempotencyModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository],
  exports: [PaymentsService]
})
export class PaymentsModule {}

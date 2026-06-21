import { Module } from "@nestjs/common";
import { EventsModule } from "../../shared/events/events.module";
import { IdempotencyModule } from "../../shared/idempotency/idempotency.module";
import { AccountingModule } from "../accounting/accounting.module";
import { InventoryModule } from "../inventory/inventory.module";
import { SalesController } from "./sales.controller";
import { SalesRepository } from "./sales.repository";
import { SalesService } from "./sales.service";

@Module({
  imports: [AccountingModule, InventoryModule, EventsModule, IdempotencyModule],
  controllers: [SalesController],
  providers: [SalesService, SalesRepository],
  exports: [SalesService]
})
export class SalesModule {}

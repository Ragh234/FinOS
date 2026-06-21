import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BullmqService } from "./bullmq.service";

@Module({
  imports: [ConfigModule],
  providers: [BullmqService],
  exports: [BullmqService]
})
export class QueuesModule {}


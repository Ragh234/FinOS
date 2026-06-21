import { Module } from "@nestjs/common";
import { PrismaModule } from "../../shared/prisma/prisma.module";
import { AiCfoController } from "./ai-cfo.controller";
import { AiCfoService } from "./ai-cfo.service";

@Module({
  imports: [PrismaModule],
  controllers: [AiCfoController],
  providers: [AiCfoService],
  exports: [AiCfoService]
})
export class AiCfoModule {}

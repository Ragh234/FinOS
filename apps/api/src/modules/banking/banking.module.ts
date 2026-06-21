import { Module } from "@nestjs/common";
import { AuditService } from "../../shared/audit/audit.service";
import { PrismaModule } from "../../shared/prisma/prisma.module";
import { BankingController } from "./banking.controller";
import { BankingRepository } from "./banking.repository";
import { BankingService } from "./banking.service";

@Module({
  imports: [PrismaModule],
  controllers: [BankingController],
  providers: [BankingService, BankingRepository, AuditService],
  exports: [BankingService]
})
export class BankingModule {}

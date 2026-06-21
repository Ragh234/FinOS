import { Module } from "@nestjs/common";
import { AccountingController } from "./accounting.controller";
import { AccountingReportsService } from "./accounting-reports.service";
import { LedgerPostingService } from "./ledger-posting.service";

@Module({
  controllers: [AccountingController],
  providers: [LedgerPostingService, AccountingReportsService],
  exports: [LedgerPostingService, AccountingReportsService]
})
export class AccountingModule {}

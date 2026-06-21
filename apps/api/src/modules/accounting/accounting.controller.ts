import { Controller, Get, Query } from "@nestjs/common";
import { CurrentTenant } from "../../shared/auth/tenant.decorator";
import { TenantContext } from "../../shared/auth/auth.types";
import { Permissions } from "../../shared/rbac/permissions.decorator";
import { AccountingReportsService } from "./accounting-reports.service";

@Controller({ path: "accounting", version: "1" })
export class AccountingController {
  constructor(private readonly reports: AccountingReportsService) {}

  @Get("general-ledger")
  @Permissions("accounting.report.read")
  generalLedger(@CurrentTenant() tenant: TenantContext, @Query("accountId") accountId?: string) {
    return this.reports.generalLedger(tenant.companyId, accountId);
  }

  @Get("trial-balance")
  @Permissions("accounting.report.read")
  trialBalance(@CurrentTenant() tenant: TenantContext) {
    return this.reports.trialBalance(tenant.companyId);
  }

  @Get("profit-and-loss")
  @Permissions("accounting.report.read")
  profitAndLoss(@CurrentTenant() tenant: TenantContext) {
    return this.reports.profitAndLoss(tenant.companyId);
  }

  @Get("balance-sheet")
  @Permissions("accounting.report.read")
  balanceSheet(@CurrentTenant() tenant: TenantContext) {
    return this.reports.balanceSheet(tenant.companyId);
  }
}

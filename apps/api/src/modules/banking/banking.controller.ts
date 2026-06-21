import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentTenant } from "../../shared/auth/tenant.decorator";
import { TenantContext } from "../../shared/auth/auth.types";
import { Permissions } from "../../shared/rbac/permissions.decorator";
import { BankingService } from "./banking.service";
import {
  CreateBankAccountDto,
  CreateBankTransactionDto,
  CreateReconciliationDto,
  ImportStatementDto,
  MatchReconciliationDto,
  UpdateReconciliationMatchDto
} from "./dto/banking.dto";

@Controller({ path: "banking", version: "1" })
export class BankingController {
  constructor(private readonly banking: BankingService) {}

  @Get("accounts")
  @Permissions("banking.read")
  listAccounts(@CurrentTenant() tenant: TenantContext) {
    return this.banking.listAccounts(tenant.companyId);
  }

  @Post("accounts")
  @Permissions("banking.create")
  createAccount(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateBankAccountDto) {
    return this.banking.createAccount(tenant.companyId, tenant.userId, dto);
  }

  @Get("accounts/:id")
  @Permissions("banking.read")
  getAccount(@CurrentTenant() tenant: TenantContext, @Param("id") id: string) {
    return this.banking.getAccount(tenant.companyId, id);
  }

  @Get("transactions")
  @Permissions("banking.read")
  listTransactions(@CurrentTenant() tenant: TenantContext, @Query("bankAccountId") bankAccountId?: string) {
    return this.banking.listTransactions(tenant.companyId, bankAccountId);
  }

  @Post("transactions")
  @Permissions("banking.create")
  createTransaction(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateBankTransactionDto) {
    return this.banking.createTransaction(tenant.companyId, tenant.userId, dto);
  }

  @Post("statement-imports")
  @Permissions("banking.import")
  importStatement(@CurrentTenant() tenant: TenantContext, @Body() dto: ImportStatementDto) {
    return this.banking.importStatement(tenant.companyId, tenant.userId, dto);
  }

  @Get("reconciliations")
  @Permissions("banking.read")
  listReconciliations(@CurrentTenant() tenant: TenantContext, @Query("bankAccountId") bankAccountId?: string) {
    return this.banking.listReconciliations(tenant.companyId, bankAccountId);
  }

  @Post("reconciliations")
  @Permissions("banking.reconcile")
  createReconciliation(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateReconciliationDto) {
    return this.banking.createReconciliation(tenant.companyId, tenant.userId, dto);
  }

  @Get("reconciliations/:id")
  @Permissions("banking.read")
  getReconciliation(@CurrentTenant() tenant: TenantContext, @Param("id") id: string) {
    return this.banking.getReconciliation(tenant.companyId, id);
  }

  @Post("reconciliations/:id/matches")
  @Permissions("banking.reconcile")
  createMatch(@CurrentTenant() tenant: TenantContext, @Param("id") id: string, @Body() dto: MatchReconciliationDto) {
    return this.banking.createMatch(tenant.companyId, tenant.userId, id, dto);
  }

  @Patch("reconciliation-matches/:id")
  @Permissions("banking.reconcile")
  updateMatch(@CurrentTenant() tenant: TenantContext, @Param("id") id: string, @Body() dto: UpdateReconciliationMatchDto) {
    return this.banking.updateMatch(tenant.companyId, tenant.userId, id, dto);
  }

  @Post("reconciliations/:id/complete")
  @Permissions("banking.reconcile")
  completeReconciliation(@CurrentTenant() tenant: TenantContext, @Param("id") id: string) {
    return this.banking.completeReconciliation(tenant.companyId, tenant.userId, id);
  }
}

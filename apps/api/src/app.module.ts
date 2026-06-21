import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./modules/auth/auth.module";
import { CompaniesModule } from "./modules/companies/companies.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { ProductsModule } from "./modules/products/products.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { AccountingModule } from "./modules/accounting/accounting.module";
import { SalesModule } from "./modules/sales/sales.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { BankingModule } from "./modules/banking/banking.module";
import { CollectionsModule } from "./modules/collections/collections.module";
import { CreditIntelligenceModule } from "./modules/credit-intelligence/credit-intelligence.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { AutomationModule } from "./modules/automation/automation.module";
import { AiCfoModule } from "./modules/ai-cfo/ai-cfo.module";
import { PrismaModule } from "./shared/prisma/prisma.module";
import { RbacModule } from "./shared/rbac/rbac.module";
import { JwtAuthGuard } from "./shared/rbac/jwt-auth.guard";
import { TenantGuard } from "./shared/rbac/tenant.guard";
import { PermissionsGuard } from "./shared/rbac/permissions.guard";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    RbacModule,
    AuthModule,
    CompaniesModule,
    CustomersModule,
    ProductsModule,
    InventoryModule,
    AccountingModule,
    SalesModule,
    PaymentsModule,
    BankingModule,
    CollectionsModule,
    CreditIntelligenceModule,
    NotificationsModule,
    AutomationModule,
    AiCfoModule
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard }
  ]
})
export class AppModule {}

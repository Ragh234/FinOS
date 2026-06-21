import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { PermissionsGuard } from "./permissions.guard";
import { TenantGuard } from "./tenant.guard";

@Module({
  imports: [JwtModule.register({})],
  providers: [JwtAuthGuard, TenantGuard, PermissionsGuard],
  exports: [JwtAuthGuard, TenantGuard, PermissionsGuard, JwtModule]
})
export class RbacModule {}

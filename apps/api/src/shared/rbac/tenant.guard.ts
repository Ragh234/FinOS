import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../prisma/prisma.service";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { ROLE_PERMISSIONS } from "./permissions";

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const companyId = request.headers["x-company-id"] as string | undefined;

    if (!companyId) {
      request.tenant = undefined;
      return true;
    }

    const membership = await this.prisma.companyMembership.findFirst({
      where: { companyId, userId: user.userId, isActive: true }
    });

    if (!membership) {
      throw new ForbiddenException("User is not a member of this company");
    }

    const rolePermissions = ROLE_PERMISSIONS[membership.role] ?? [];
    request.tenant = {
      companyId,
      userId: user.userId,
      role: membership.role,
      permissions: [...new Set([...rolePermissions, ...membership.permissions])]
    };

    return true;
  }
}

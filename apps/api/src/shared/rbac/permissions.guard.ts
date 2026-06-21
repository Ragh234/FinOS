import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "./permissions.decorator";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { hasPermission } from "./permissions";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) {
      return true;
    }

    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!required?.length) {
      return true;
    }

    const tenant = context.switchToHttp().getRequest().tenant;
    if (!tenant) {
      throw new ForbiddenException("Company context is required");
    }

    const allowed = required.every((permission) => hasPermission(tenant.permissions, permission));
    if (!allowed) {
      throw new ForbiddenException("Insufficient permissions");
    }

    return true;
  }
}

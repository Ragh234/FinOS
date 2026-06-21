import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { TenantContext } from "./auth.types";

export const CurrentTenant = createParamDecorator((_data: unknown, ctx: ExecutionContext): TenantContext => {
  return ctx.switchToHttp().getRequest().tenant;
});

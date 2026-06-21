import { CompanyRole } from "@finos/database";

export type AuthenticatedUser = {
  userId: string;
  email: string;
  activeCompanyId?: string;
  role?: CompanyRole;
  permissions: string[];
};

export type TenantContext = {
  companyId: string;
  userId: string;
  role: CompanyRole;
  permissions: string[];
};

import { Injectable, NotFoundException } from "@nestjs/common";
import { CompanyRole } from "@finos/database";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";
import { CompanyBootstrapService } from "./company-bootstrap.service";

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bootstrapper: CompanyBootstrapService
  ) {}

  async create(userId: string, dto: CreateCompanyDto) {
    const financialYearStart = new Date(dto.financialYearStart);

    return this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: dto.name.trim(),
          gstNumber: dto.gstNumber,
          panNumber: dto.panNumber,
          addressLine1: dto.addressLine1,
          addressLine2: dto.addressLine2,
          city: dto.city,
          state: dto.state,
          postalCode: dto.postalCode,
          country: dto.country ?? "IN",
          currency: dto.currency ?? "INR",
          financialYearStart
        }
      });

      await tx.companyMembership.create({
        data: {
          companyId: company.id,
          userId,
          role: CompanyRole.OWNER,
          permissions: ["*"]
        }
      });

      await this.bootstrapper.bootstrap(tx, company.id, financialYearStart);
      return company;
    });
  }

  listForUser(userId: string) {
    return this.prisma.company.findMany({
      where: { memberships: { some: { userId, isActive: true } } },
      orderBy: { name: "asc" },
      include: {
        memberships: {
          where: { userId },
          select: { role: true, permissions: true, isActive: true }
        }
      }
    });
  }

  async get(companyId: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new NotFoundException("Company not found");
    }
    return company;
  }

  async update(companyId: string, dto: UpdateCompanyDto) {
    await this.get(companyId);
    return this.prisma.company.update({
      where: { id: companyId },
      data: {
        ...dto,
        financialYearStart: dto.financialYearStart ? new Date(dto.financialYearStart) : undefined
      }
    });
  }

  members(companyId: string) {
    return this.prisma.companyMembership.findMany({
      where: { companyId, isActive: true },
      include: { user: { select: { id: true, name: true, email: true, status: true } } },
      orderBy: { createdAt: "asc" }
    });
  }
}

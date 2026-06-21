import { Injectable, NotFoundException } from "@nestjs/common";
import { PartyType, Prisma } from "@finos/database";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { ListCustomersDto } from "./dto/list-customers.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateCustomerDto) {
    return this.prisma.party.create({
      data: {
        companyId,
        type: PartyType.CUSTOMER,
        name: dto.name.trim(),
        contactName: dto.contactName,
        email: dto.email?.toLowerCase(),
        phone: dto.phone,
        gstNumber: dto.gstNumber,
        panNumber: dto.panNumber,
        creditLimit: dto.creditLimit ?? 0,
        metadata: dto.metadata === undefined ? Prisma.JsonNull : (dto.metadata as Prisma.InputJsonValue),
        addresses: dto.addresses?.length
          ? {
              create: dto.addresses.map((address) => ({
                companyId,
                label: address.label ?? "Primary",
                line1: address.line1,
                line2: address.line2,
                city: address.city,
                state: address.state,
                postalCode: address.postalCode,
                country: address.country ?? "IN",
                isDefault: address.isDefault ?? false
              }))
            }
          : undefined,
        creditProfiles: {
          create: {
            companyId,
            approvedCreditLimit: dto.creditLimit ?? 0
          }
        }
      },
      include: { addresses: true, creditProfiles: true }
    });
  }

  async list(companyId: string, query: ListCustomersDto) {
    const where: Prisma.PartyWhereInput = {
      companyId,
      type: PartyType.CUSTOMER,
      deletedAt: null,
      OR: query.search
        ? [
            { name: { contains: query.search, mode: "insensitive" } },
            { contactName: { contains: query.search, mode: "insensitive" } },
            { email: { contains: query.search, mode: "insensitive" } },
            { phone: { contains: query.search, mode: "insensitive" } },
            { gstNumber: { contains: query.search, mode: "insensitive" } }
          ]
        : undefined
    };

    const customers = await this.prisma.party.findMany({
      where,
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: [{ name: "asc" }, { id: "asc" }],
      include: { creditProfiles: true }
    });

    const hasNextPage = customers.length > query.limit;
    const data = hasNextPage ? customers.slice(0, query.limit) : customers;
    return {
      data,
      pageInfo: {
        hasNextPage,
        nextCursor: hasNextPage ? data[data.length - 1]?.id : null
      }
    };
  }

  async get(companyId: string, id: string) {
    const customer = await this.prisma.party.findFirst({
      where: { id, companyId, type: PartyType.CUSTOMER, deletedAt: null },
      include: {
        addresses: true,
        creditProfiles: true,
        invoices: {
          take: 10,
          orderBy: { issueDate: "desc" }
        },
        payments: {
          take: 10,
          orderBy: { paymentDate: "desc" }
        }
      }
    });

    if (!customer) {
      throw new NotFoundException("Customer not found");
    }

    return customer;
  }

  async update(companyId: string, id: string, dto: UpdateCustomerDto) {
    await this.get(companyId, id);

    return this.prisma.party.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        contactName: dto.contactName,
        email: dto.email?.toLowerCase(),
        phone: dto.phone,
        gstNumber: dto.gstNumber,
        panNumber: dto.panNumber,
        creditLimit: dto.creditLimit,
        metadata: dto.metadata === undefined ? undefined : (dto.metadata as Prisma.InputJsonValue),
        creditProfiles:
          dto.creditLimit === undefined
            ? undefined
            : {
                updateMany: {
                  where: { companyId, partyId: id },
                  data: { approvedCreditLimit: dto.creditLimit }
                }
              }
      },
      include: { addresses: true, creditProfiles: true }
    });
  }

  async remove(companyId: string, id: string) {
    await this.get(companyId, id);
    return this.prisma.party.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true }
    });
  }
}

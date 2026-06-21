import { Global, Module } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { DocumentNumberService } from "../sequences/document-number.service";
import { PrismaService } from "./prisma.service";

@Global()
@Module({
  providers: [PrismaService, AuditService, DocumentNumberService],
  exports: [PrismaService, AuditService, DocumentNumberService]
})
export class PrismaModule {}

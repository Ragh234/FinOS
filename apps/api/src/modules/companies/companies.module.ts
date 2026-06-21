import { Module } from "@nestjs/common";
import { CompaniesController } from "./companies.controller";
import { CompaniesService } from "./companies.service";
import { CompanyBootstrapService } from "./company-bootstrap.service";

@Module({
  controllers: [CompaniesController],
  providers: [CompaniesService, CompanyBootstrapService],
  exports: [CompaniesService, CompanyBootstrapService]
})
export class CompaniesModule {}

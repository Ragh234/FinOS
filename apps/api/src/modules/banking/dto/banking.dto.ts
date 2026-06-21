import { Type } from "class-transformer";
import { IsArray, IsDateString, IsEnum, IsInt, IsNumber, IsObject, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { BankAccountType, BankTransactionType, ReconciliationMatchStatus } from "@finos/database";

export class CreateBankAccountDto {
  @IsString()
  name!: string;

  @IsEnum(BankAccountType)
  accountType!: BankAccountType;

  @IsOptional()
  @IsString()
  ledgerAccountId?: string;

  @IsOptional()
  @IsString()
  institutionName?: string;

  @IsOptional()
  @IsString()
  accountNumberMasked?: string;

  @IsOptional()
  @IsString()
  ifscOrRoutingCode?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  openingBalance = 0;
}

export class CreateBankTransactionDto {
  @IsString()
  bankAccountId!: string;

  @IsEnum(BankTransactionType)
  type!: BankTransactionType;

  @IsDateString()
  transactionDate!: string;

  @IsOptional()
  @IsDateString()
  valueDate?: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  debitAmount = 0;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  creditAmount = 0;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  runningBalance?: number;

  @IsOptional()
  @IsString()
  counterpartyName?: string;

  @IsOptional()
  @IsString()
  externalId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class StatementLineDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  lineNumber!: number;

  @IsDateString()
  transactionDate!: string;

  @IsOptional()
  @IsDateString()
  valueDate?: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  debitAmount = 0;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  creditAmount = 0;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  balance?: number;

  @IsObject()
  raw!: Record<string, unknown>;
}

export class ImportStatementDto {
  @IsString()
  bankAccountId!: string;

  @IsString()
  fileName!: string;

  @IsString()
  fileHash!: string;

  @IsString()
  source!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StatementLineDto)
  lines!: StatementLineDto[];
}

export class CreateReconciliationDto {
  @IsString()
  bankAccountId!: string;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @Type(() => Number)
  @IsNumber()
  statementOpeningBalance!: number;

  @Type(() => Number)
  @IsNumber()
  statementClosingBalance!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class MatchReconciliationDto {
  @IsOptional()
  @IsString()
  bankTransactionId?: string;

  @IsOptional()
  @IsString()
  statementLineId?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  matchedAmount!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  matchScore?: number;
}

export class UpdateReconciliationMatchDto {
  @IsEnum(ReconciliationMatchStatus)
  status!: ReconciliationMatchStatus;

  @IsOptional()
  @IsString()
  rejectedReason?: string;
}

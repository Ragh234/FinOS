import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { PaymentDirection } from "@finos/database";

export class PaymentAllocationDto {
  @IsString()
  invoiceId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  amount!: number;
}

export class CreatePaymentDto {
  @IsString()
  partyId!: string;

  @IsEnum(PaymentDirection)
  direction!: PaymentDirection;

  @IsDateString()
  paymentDate!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  amount!: number;

  @IsString()
  method!: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  bankAccountId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationDto)
  allocations?: PaymentAllocationDto[];
}

import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";
import { CollectionFollowUpStatus, CollectionOutcome, NotificationChannel, PromiseToPayStatus } from "@finos/database";

export class CreateFollowUpDto {
  @IsString()
  partyId!: string;

  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  priority?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  expectedAmount?: number;

  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateFollowUpDto {
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  priority?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  expectedAmount?: number;

  @IsOptional()
  @IsEnum(CollectionFollowUpStatus)
  status?: CollectionFollowUpStatus;

  @IsOptional()
  @IsEnum(CollectionOutcome)
  outcome?: CollectionOutcome;

  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  nextFollowUpAt?: string;
}

export class CreatePromiseDto {
  @IsString()
  partyId!: string;

  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsOptional()
  @IsString()
  sourceFollowUpId?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  promisedAmount!: number;

  @IsDateString()
  promisedDate!: string;

  @IsOptional()
  @IsDateString()
  reminderDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePromiseDto {
  @IsOptional()
  @IsEnum(PromiseToPayStatus)
  status?: PromiseToPayStatus;

  @IsOptional()
  @IsString()
  brokenReason?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  reminderDate?: string;
}

export class AllocatePromisePaymentDto {
  @IsString()
  paymentId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;
}

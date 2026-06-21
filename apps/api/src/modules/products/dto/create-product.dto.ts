import { Type } from "class-transformer";
import { IsBoolean, IsNumber, IsObject, IsOptional, IsString, Min } from "class-validator";

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsString()
  sku!: string;

  @IsString()
  unitId!: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  taxRateId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costPrice = 0;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sellingPrice = 0;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isInventoryItem = true;
}

import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsNumber, IsObject, IsOptional, IsString, Min } from "class-validator";

export class CreateCategoryDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class CreateUnitDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  precision = 2;
}

export class CreateTaxRateDto {
  @IsString()
  name!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rate!: number;
}

export class CreateAttributeDefinitionDto {
  @IsString()
  name!: string;

  @IsString()
  dataType!: string;

  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}

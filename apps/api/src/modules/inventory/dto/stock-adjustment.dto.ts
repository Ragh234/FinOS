import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class StockAdjustmentDto {
  @IsString()
  productId!: string;

  @IsString()
  locationId!: string;

  @Type(() => Number)
  @IsNumber()
  quantity!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  unitCost?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

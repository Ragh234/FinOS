import { IsOptional, IsString } from "class-validator";

export class ListStockDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  locationId?: string;
}

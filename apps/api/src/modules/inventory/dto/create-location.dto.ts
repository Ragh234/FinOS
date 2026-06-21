import { IsOptional, IsString } from "class-validator";

export class CreateLocationDto {
  @IsString()
  name!: string;

  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  address?: string;
}

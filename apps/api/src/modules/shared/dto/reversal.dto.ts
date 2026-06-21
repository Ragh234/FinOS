import { IsOptional, IsString } from "class-validator";

export class ReversalDto {
  @IsOptional()
  @IsString()
  reason?: string;
}


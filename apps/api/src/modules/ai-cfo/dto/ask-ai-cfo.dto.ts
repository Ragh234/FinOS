import { IsString, MinLength } from "class-validator";

export class AskAiCfoDto {
  @IsString()
  @MinLength(3)
  question!: string;
}

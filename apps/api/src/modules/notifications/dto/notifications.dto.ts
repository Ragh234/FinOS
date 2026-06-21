import { IsEnum, IsObject, IsOptional, IsString } from "class-validator";
import { NotificationChannel } from "@finos/database";

export class UpsertNotificationTemplateDto {
  @IsString()
  code!: string;

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;
}

export class QueueNotificationDto {
  @IsString()
  templateCode!: string;

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsString()
  destination!: string;

  @IsOptional()
  @IsString()
  recipientUserId?: string;

  @IsOptional()
  @IsString()
  partyId?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;
}


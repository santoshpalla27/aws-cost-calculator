import { IsString, IsOptional, IsUUID, IsEnum, IsBoolean, IsJSON } from 'class-validator';
import { IntegrationType } from '@prisma/client';

export class CreateIntegrationDto {
  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @IsEnum(IntegrationType)
  integrationType: IntegrationType;

  @IsOptional()
  @IsJSON()
  config?: any;

  @IsOptional()
  @IsJSON()
  credentials?: any;
}
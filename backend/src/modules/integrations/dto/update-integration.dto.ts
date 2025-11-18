import { IsString, IsOptional, IsEnum, IsBoolean, IsJSON } from 'class-validator';
import { IntegrationType } from '@prisma/client';

export class UpdateIntegrationDto {
  @IsOptional()
  @IsJSON()
  config?: any;

  @IsOptional()
  @IsJSON()
  credentials?: any;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
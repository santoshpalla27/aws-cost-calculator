import { IsString, IsOptional, IsEnum, IsDateString, IsUUID, MaxLength, IsUrl } from 'class-validator';
import { ProjectType, ProjectStatus } from '@prisma/client';

export class CreateProjectDto {
  @IsUUID()
  workspaceId: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(10)
  key: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(ProjectType)
  projectType?: ProjectType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
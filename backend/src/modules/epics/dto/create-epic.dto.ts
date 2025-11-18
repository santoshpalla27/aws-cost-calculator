import { IsString, IsOptional, IsEnum, IsDateString, IsUUID, MaxLength } from 'class-validator';
import { Priority, Status } from '@prisma/client';

export class CreateEpicDto {
  @IsUUID()
  projectId: string;

  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;
}
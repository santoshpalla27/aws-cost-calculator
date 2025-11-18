import { IsString, IsOptional, IsBoolean, IsEnum, IsDateString, MaxLength, IsNumber, Min, Max } from 'class-validator';
import { Priority, RecurrencePattern } from '@prisma/client';

export class UpdatePersonalTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsDateString()
  dueTime?: string;

  @IsOptional()
  @IsEnum(RecurrencePattern)
  recurrencePattern?: RecurrencePattern;

  @IsOptional()
  recurrenceConfig?: any;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  position?: number;

  @IsOptional()
  metadata?: any;

  @IsOptional()
  @IsDateString()
  completedAt?: string;
}
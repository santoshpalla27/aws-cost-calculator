import { IsString, IsOptional, MaxLength, IsEnum, IsNumber, Min } from 'class-validator';
import { HabitFrequency } from '@prisma/client';

export class UpdateHabitDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(HabitFrequency)
  frequency?: HabitFrequency;

  @IsOptional()
  targetDays?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  streakCount?: number;
}
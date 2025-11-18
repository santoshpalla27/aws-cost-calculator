import { IsString, IsOptional, MaxLength, IsEnum } from 'class-validator';
import { HabitFrequency } from '@prisma/client';

export class CreateHabitDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsEnum(HabitFrequency)
  frequency: HabitFrequency;

  @IsOptional()
  targetDays?: string[]; // For habits that should only be done on specific days
}
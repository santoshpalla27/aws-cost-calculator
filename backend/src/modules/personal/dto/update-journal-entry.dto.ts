import { IsString, IsOptional, MaxLength, IsEnum, IsDateString } from 'class-validator';
import { Mood } from '@prisma/client';

export class UpdateJournalEntryDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @IsOptional()
  @IsEnum(Mood)
  mood?: Mood;

  @IsOptional()
  tags?: string[];

  @IsOptional()
  @IsDateString()
  entryDate?: string;
}
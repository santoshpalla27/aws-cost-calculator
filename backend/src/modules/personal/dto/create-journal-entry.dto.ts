import { IsString, IsOptional, MaxLength, IsEnum, IsDateString } from 'class-validator';
import { Mood } from '@prisma/client';

export class CreateJournalEntryDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsString()
  @MaxLength(5000)
  content: string;

  @IsOptional()
  @IsEnum(Mood)
  mood?: Mood;

  @IsOptional()
  tags?: string[]; // Array of tag strings

  @IsOptional()
  @IsDateString()
  entryDate?: string; // If not provided, defaults to today
}
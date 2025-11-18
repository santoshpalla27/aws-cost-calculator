import { IsString, IsEnum, IsOptional, IsJSON } from 'class-validator';
import { BlockType } from '@prisma/client';

export class UpdateBlockDto {
  @IsOptional()
  @IsEnum(BlockType)
  blockType?: BlockType;

  @IsOptional()
  @IsJSON()
  content?: any;

  @IsOptional()
  @IsJSON()
  properties?: any;
}
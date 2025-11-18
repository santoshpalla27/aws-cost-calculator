import { IsString, IsEnum, IsOptional, IsUUID, IsNumber, IsJSON } from 'class-validator';
import { BlockType } from '@prisma/client';

export class CreateBlockDto {
  @IsEnum(BlockType)
  blockType: BlockType;

  @IsJSON()
  content: any;

  @IsOptional()
  @IsJSON()
  properties?: any;

  @IsNumber()
  position: number;

  @IsOptional()
  @IsUUID()
  parentBlockId?: string;
}